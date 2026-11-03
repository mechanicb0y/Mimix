import 'server-only'
import { createHash } from 'node:crypto'
import { and, desc, eq, lt } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import type { DubOutput, TranscriptSegment } from '@/server/db/schema'
import { engineForSpeech, engineForVoice, engineVoiceIdFor, getVoiceEngine, hiddenLibraryVoiceIds, kokoroIsMain, requireCloning, requireEngineFeature } from '@/server/engine'
import { getTranslator } from '@/server/translate'
import { createJob, registerJobHandler, type JobContext } from '@/server/jobs'
import { deleteGeneration, finishGeneration, getGeneration, startGeneration, type Actor } from '@/server/generations'
import { chargeMediaJob, consumeUploads, queueMediaJob } from '@/server/media-jobs'
import { paramsOf, resolveVoiceForUse, type VoiceRow } from '@/server/voices'
import { workspacePlan } from '@/server/modules/voices'
import { getStorage } from '@/server/storage'
import { muxVideo, placeWav, subtractWav, toWav, wavDurationMs, wavToMp3 } from '@/server/audio'
import { provenanceComment } from '@/server/provenance'
import { getBalance, InsufficientCreditsError } from '@/server/credits'
import { newId } from '@/server/ids'
import { UserError } from '@/server/api/errors'
import { CREDIT_RATES, planHas } from '@/config/plans'
import { ENGINE_LIMITS } from '@/config/engine-limits'
import { LIBRARY_VOICES } from '@/config/voices'
import { computePeaks, decodeWav } from '@/lib/voice/wav'
import { toSrt, toVtt } from '@/lib/transcript-format'
import { getMessages } from '@/i18n'
import type { DubCreateInput, DubPatchInput } from '@/lib/schemas/dubbing'

/**
 * Dubbing: transcribe → translate → re-voice each line in its speaker's voice → mix over the
 * original background → mux back into the video.
 *
 * Cost: the first full dub is charged per started minute, per target language (CREDIT_RATES.dubbingPerMinute),
 * from the measured length. After editing, a re-render charges only the characters of lines whose
 * text or voice changed, at the speech rate, so fixing one line costs what saying it costs.
 *
 * Consent (brief section 9): speakers are voiced with voices the workspace may use, never an
 * unverified copy of the original speaker. To keep someone's own voice, clone it first (the clone
 * flow verifies the speaker), then cast that clone.
 */
export type DubRow = typeof schema.dubbingProject.$inferSelect

const MAX_MS = () => ENGINE_LIMITS.dubbingMaxMinutes.value * 60_000
/** Working sample rate for the dub timeline. */
const DUB_RATE = 24000
/** A line may run this much longer than its slot before we speed it up (up to MAX_SPEED). */
const FIT_TOLERANCE = 1.05
const MAX_SPEED = 1.2
const errs = () => getMessages('en').errors.app.dubbing

const dir = (p: { workspaceId: string; id: string }) => `${p.workspaceId}/dub/${p.id}`
const lineHash = (s: TranscriptSegment, voiceId: string | undefined) => createHash('sha256').update(`${voiceId ?? ''}\u0000${s.text}`).digest('hex').slice(0, 16)
const isVideo = (mime: string) => mime.startsWith('video/')

export async function createDub(actor: Actor, input: DubCreateInput) {
  requireEngineFeature('transcribe')
  if (!planHas(await workspacePlan(actor.workspaceId), 'dubbing')) throw new UserError('plan_feature', errs().notIncluded, 403)
  const id = newId('dub')
  const job = await queueMediaJob(actor, {
    type: 'dub_prepare', module: 'dubbing', uploadId: input.uploadId, perMinute: CREDIT_RATES.dubbingPerMinute * input.targetLanguages.length,
    declaredMs: input.declaredMs, maxMs: MAX_MS(), input: { projectId: id, speakers: input.speakers ?? null },
  })
  const filename = String(job.input.filename ?? '')
  const [row] = await getDb().insert(schema.dubbingProject).values({
    id, workspaceId: actor.workspaceId, title: input.title?.trim() || filename.replace(/\.[a-z0-9]+$/i, '') || 'Untitled dub',
    sourceKey: '', sourceMime: '', sourceLanguage: input.sourceLanguage ?? 'auto', targetLanguages: input.targetLanguages,
    keepBackground: input.keepBackground, status: 'transcribing', jobId: job.id,
  }).returning()
  return { project: await dubView(row!), jobId: job.id }
}

registerJobHandler('dub_prepare', async (ctx) => {
  const { projectId, speakers } = ctx.job.input as { projectId: string; speakers: number | null }
  const p = await load(projectId)
  try {
    const { wav: raw, durationMs, generation, upload } = await chargeMediaJob(ctx, {
      module: 'dubbing', perMinute: CREDIT_RATES.dubbingPerMinute * p.targetLanguages.length, maxMs: MAX_MS(), sampleRate: DUB_RATE,
      input: { projectId, targetLanguages: p.targetLanguages },
    })
    const engine = getVoiceEngine()
    const storage = await getStorage()
    const sourceKey = `${dir(p)}/source.${upload.filename.split('.').pop()?.toLowerCase() || 'bin'}`
    await storage.put(sourceKey, upload.data, upload.mime ?? 'application/octet-stream')

    let backgroundKey: string | null = null
    if (p.keepBackground) {
      await ctx.progress(10, 'separating')
      const voice = await atRate((await engine.isolate({ audio: raw })).audio)
      backgroundKey = `${dir(p)}/background.mp3`
      await storage.put(backgroundKey, await wavToMp3(subtractWav(raw, voice)), 'audio/mpeg')
    }
    await ctx.checkCancelled()
    await ctx.progress(25, 'transcribing')
    const t = await engine.transcribe({ audio: raw, language: p.sourceLanguage === 'auto' ? undefined : p.sourceLanguage, speakers: speakers ?? undefined })
    const segments = t.segments.filter((s) => s.text.trim())
    if (!segments.length) throw new UserError('no_speech', errs().noSpeech, 422)

    // Default cast: library voices in turn. The user can recast and re-render.
    const cast: Record<string, string> = {}
    const hidden = new Set(hiddenLibraryVoiceIds())
    const castable = LIBRARY_VOICES.map((v) => `lib_${v.id}`).filter((id) => !hidden.has(id))
    for (const s of segments) cast[s.speaker] ??= castable[Object.keys(cast).length % castable.length]!

    await ctx.progress(35, 'translating')
    const translator = getTranslator()
    const outputs: Record<string, DubOutput> = {}
    for (const lang of p.targetLanguages) {
      const lines = await translator.translate(segments.map((s) => s.text), t.language, lang)
      outputs[lang] = { segments: segments.map((s, i) => ({ ...s, text: lines[i] ?? s.text })), status: 'pending' }
    }
    await update(p.id, { sourceKey, sourceMime: upload.mime ?? '', sourceLanguage: t.language, durationMs, segments, cast, outputs, backgroundKey, status: 'rendering' })
    await consumeUploads([upload])

    let fresh = await load(projectId)
    for (const [i, lang] of p.targetLanguages.entries()) {
      await ctx.checkCancelled()
      await ctx.progress(40 + Math.round((i / p.targetLanguages.length) * 55), `dubbing:${lang}`)
      fresh = await renderLanguage(fresh, lang, { actor: actorOf(ctx), credits: 0 })
    }
    await update(p.id, { status: 'done', jobId: null, error: null })
    return { projectId: p.id, generationId: generation.id }
  } catch (e) {
    await update(p.id, { status: 'failed', jobId: null, error: (e as Error).name === 'JobCancelledError' ? null : (e as Error).message })
    throw e
  }
})

/** Re-renders one language after edits; charges only changed lines. */
export async function queueRender(actor: Actor, id: string, language: string) {
  const p = await getDub(actor.workspaceId, id)
  if (p.jobId || p.status === 'rendering' || p.status === 'transcribing') throw new UserError('busy', errs().busy, 409)
  const out = p.outputs[language]
  if (!out) throw new UserError('unknown_language', errs().unknownLanguage, 422, { language: errs().unknownLanguage })
  const credits = rerenderCredits(p, language)
  if (credits === 0 && out.status === 'done') throw new UserError('nothing_changed', errs().nothingChanged, 409)
  const b = await getBalance(actor.workspaceId)
  if (!b.unlimited && b.total < credits) throw new InsufficientCreditsError(credits, b.total)
  const job = await createJob({ workspaceId: actor.workspaceId, userId: actor.userId, type: 'dub_render', input: { projectId: id, language, apiKeyId: actor.apiKeyId } })
  await update(id, { jobId: job.id, status: 'rendering', outputs: { ...p.outputs, [language]: { ...out, status: 'rendering', error: undefined } } })
  return job
}

registerJobHandler('dub_render', async (ctx) => {
  const { projectId, language } = ctx.job.input as { projectId: string; language: string }
  let p = await load(projectId)
  try {
    p = await renderLanguage(p, language, { actor: actorOf(ctx), credits: rerenderCredits(p, language), ctx })
    await update(p.id, { status: 'done', jobId: null, error: null })
    return { projectId, language, generationId: p.outputs[language]?.generationId ?? null }
  } catch (e) {
    const cur = await load(projectId)
    const out = cur.outputs[language]
    await update(projectId, { status: 'done', jobId: null, outputs: out ? { ...cur.outputs, [language]: { ...out, status: 'failed', error: (e as Error).message } } : cur.outputs })
    throw e
  }
})

function actorOf(ctx: JobContext): Actor {
  return { workspaceId: ctx.job.workspaceId, userId: ctx.job.userId, apiKeyId: (ctx.job.input.apiKeyId as string | null | undefined) ?? null }
}

/** Characters of the lines that changed (text or voice) since the language was last rendered. */
export function rerenderCredits(p: DubRow, language: string): number {
  const out = p.outputs[language]
  if (!out) return 0
  const prev = out.rendered ?? []
  return out.segments.reduce((n, s, i) => (prev[i] === lineHash(s, p.cast[s.speaker]) ? n : n + s.text.length), 0) * CREDIT_RATES.ttsPerCharacter
}

async function atRate(wav: Uint8Array): Promise<Uint8Array> {
  return decodeWav(wav).sampleRate === DUB_RATE ? wav : toWav(wav, DUB_RATE)
}

/** Voices every line of one language, fits it to the original timing, mixes the background, stores audio (and video). */
async function renderLanguage(p: DubRow, lang: string, opts: { actor: Actor; credits: number; ctx?: JobContext }): Promise<DubRow> {
  const out = p.outputs[lang]
  if (!out) throw new UserError('unknown_language', errs().unknownLanguage, 422)
  const engine = getVoiceEngine()
  const storage = await getStorage()
  const voices = new Map<string, VoiceRow>()
  for (const [speaker, voiceId] of Object.entries(p.cast)) voices.set(speaker, await resolveVoiceForUse(voiceId, p.workspaceId))

  const chars = out.segments.reduce((n, s) => n + s.text.length, 0)
  const g = await startGeneration(opts.actor, { module: 'dubbing', units: chars, credits: opts.credits, input: { projectId: p.id, language: lang, text: `${p.title} (${lang})` } })
  if (opts.ctx) {
    // Link the charge so a failed re-render refunds it.
    await getDb().update(schema.job).set({ generationId: g.id }).where(eq(schema.job.id, opts.ctx.job.id))
    opts.ctx.job.generationId = g.id
  }
  const clips: Array<{ wav: Uint8Array; atMs: number }> = []
  for (const [i, s] of out.segments.entries()) {
    if (!s.text.trim()) continue
    const v = voices.get(s.speaker)
    if (!v) throw new UserError('unknown_speaker', errs().unknownSpeaker, 422)
    // Mixer voices speak English on the mixer engine; other languages use the main engine. With Kokoro
    // as the main engine, a language it doesn't speak goes to the graphics-card engine when there is one.
    const e = kokoroIsMain() ? engineForSpeech(v, lang) : lang.startsWith('en') ? engineForVoice(v) : engine
    const req = { text: s.text, voice: paramsOf(v), engineVoiceId: engineVoiceIdFor(v, e), language: lang, seed: `${p.id}:${lang}:${i}` }
    let a = await e.synthesize(req)
    const slot = s.endMs - s.startMs
    if (a.durationMs > slot * FIT_TOLERANCE) a = await e.synthesize({ ...req, settings: { speed: Math.min(MAX_SPEED, a.durationMs / slot) } })
    clips.push({ wav: await atRate(a.audio), atMs: s.startMs })
    if (opts.ctx && i % 10 === 0) await opts.ctx.checkCancelled()
  }
  const lastEnd = clips.reduce((m, c) => Math.max(m, c.atMs + wavDurationMs(c.wav)), 0)
  const total = Math.max(p.durationMs, lastEnd)
  let mix = placeWav(clips, total, DUB_RATE)
  if (p.backgroundKey) {
    const bg = await storage.get(p.backgroundKey)
    if (bg) mix = placeWav([{ wav: mix, atMs: 0 }, { wav: await toWav(bg, DUB_RATE), atMs: 0 }], total, DUB_RATE)
  }
  const samples = decodeWav(mix).samples
  const done = await finishGeneration(g, { audio: mix, mimeType: 'audio/wav', sampleRate: DUB_RATE, durationMs: wavDurationMs(mix), peaks: computePeaks(samples) }, 'mp3')

  let videoKey: string | undefined
  if (isVideo(p.sourceMime)) {
    const video = await storage.get(p.sourceKey)
    const audio = await storage.get(done.outputKey!)
    if (video && audio) {
      videoKey = `${dir(p)}/${lang}-${done.id.slice(4, 12)}.mp4`
      await storage.put(videoKey, await muxVideo(video, audio, provenanceComment(done.id)), 'video/mp4')
    }
  }
  // Older renders of this language stay in history (and keep their provenance record); only the
  // project's pointer and the old muxed video move on.
  if (out.videoKey && out.videoKey !== videoKey) await storage.delete(out.videoKey)
  const cur = await load(p.id)
  const next: DubOutput = { ...cur.outputs[lang]!, status: 'done', rendered: out.segments.map((s) => lineHash(s, p.cast[s.speaker])), generationId: done.id, videoKey, error: undefined }
  return update(p.id, { outputs: { ...cur.outputs, [lang]: next } })
}

/* ------------------------------------------------------------------ read, edit, delete */

async function load(id: string): Promise<DubRow> {
  const [p] = await getDb().select().from(schema.dubbingProject).where(eq(schema.dubbingProject.id, id))
  if (!p) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  return p
}

async function update(id: string, patch: Partial<typeof schema.dubbingProject.$inferInsert>): Promise<DubRow> {
  const [p] = await getDb().update(schema.dubbingProject).set({ ...patch, updatedAt: new Date() }).where(eq(schema.dubbingProject.id, id)).returning()
  return p!
}

export async function getDub(workspaceId: string, id: string): Promise<DubRow> {
  const [p] = await getDb().select().from(schema.dubbingProject).where(and(eq(schema.dubbingProject.id, id), eq(schema.dubbingProject.workspaceId, workspaceId)))
  if (!p) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  return p
}

export async function listDubs(workspaceId: string, opts: { before?: Date; limit: number }) {
  const where = [eq(schema.dubbingProject.workspaceId, workspaceId)]
  if (opts.before) where.push(lt(schema.dubbingProject.createdAt, opts.before))
  return getDb().select().from(schema.dubbingProject).where(and(...where)).orderBy(desc(schema.dubbingProject.createdAt)).limit(opts.limit)
}

export function dubSummary(p: DubRow) {
  return {
    id: p.id, title: p.title, status: p.status, sourceLanguage: p.sourceLanguage, targetLanguages: p.targetLanguages, durationMs: p.durationMs,
    isVideo: isVideo(p.sourceMime), jobId: p.jobId, error: p.error, createdAt: p.createdAt, updatedAt: p.updatedAt,
  }
}

export async function dubView(p: DubRow) {
  const storage = await getStorage()
  const base = p.title.replace(/[^\w.-]+/g, '-').slice(0, 60) || 'dub'
  const outputs: Record<string, unknown> = {}
  for (const lang of p.targetLanguages) {
    const o = p.outputs[lang]
    if (!o) { outputs[lang] = { status: 'pending', segments: [], audioUrl: null, downloadUrl: null, videoUrl: null, rerenderCredits: 0 }; continue }
    const g = o.generationId ? await getGeneration(o.generationId, p.workspaceId) : null
    outputs[lang] = {
      status: o.status, error: o.error ?? null, segments: o.segments, generationId: o.generationId ?? null, rerenderCredits: rerenderCredits(p, lang),
      audioUrl: g?.outputKey ? await storage.signedUrl(g.outputKey) : null,
      downloadUrl: g?.outputKey ? await storage.signedUrl(g.outputKey, { downloadName: `${base}-${lang}.mp3` }) : null,
      peaks: Array.isArray(g?.input.peaks) ? g.input.peaks : [], durationMs: g?.durationMs ?? null,
      videoUrl: o.videoKey ? await storage.signedUrl(o.videoKey, { downloadName: `${base}-${lang}.mp4` }) : null,
    }
  }
  return {
    ...dubSummary(p), keepBackground: p.keepBackground, segments: p.segments, cast: p.cast,
    sourceUrl: p.sourceKey ? await storage.signedUrl(p.sourceKey) : null, outputs,
  }
}

export async function patchDub(workspaceId: string, id: string, input: DubPatchInput) {
  const p = await getDub(workspaceId, id)
  if (p.jobId || p.status === 'rendering' || p.status === 'transcribing') throw new UserError('busy', errs().busy, 409)
  const patch: Partial<typeof schema.dubbingProject.$inferInsert> = {}
  if (input.title) patch.title = input.title
  if (input.cast) {
    const speakers = new Set(p.segments.map((s) => s.speaker))
    for (const [speaker, voiceId] of Object.entries(input.cast)) {
      if (!speakers.has(speaker)) throw new UserError('unknown_speaker', errs().unknownSpeaker, 422, { [`cast.${speaker}`]: errs().unknownSpeaker })
      const v = await resolveVoiceForUse(voiceId, workspaceId)
      // Casting a clone keeps a real person's voice, so it waits for the production consent check too.
      if (v.kind === 'instant_clone' || v.kind === 'professional_clone') requireCloning()
    }
    patch.cast = { ...p.cast, ...input.cast }
  }
  if (input.segments && input.language) {
    const out = p.outputs[input.language]
    if (!out) throw new UserError('unknown_language', errs().unknownLanguage, 422, { language: errs().unknownLanguage })
    const speakers = new Set(p.segments.map((s) => s.speaker))
    if (input.segments.some((s) => !speakers.has(s.speaker))) throw new UserError('unknown_speaker', errs().unknownSpeaker, 422)
    // Keep the render hashes aligned by position: a changed line's hash simply stops matching.
    patch.outputs = { ...p.outputs, [input.language]: { ...out, segments: input.segments } }
  }
  return dubView(await update(id, patch))
}

export async function deleteDub(workspaceId: string, id: string) {
  const p = await getDub(workspaceId, id)
  if (p.status === 'transcribing' || p.status === 'rendering') throw new UserError('busy', errs().busy, 409)
  const storage = await getStorage()
  for (const key of [p.sourceKey, p.backgroundKey, ...Object.values(p.outputs).map((o) => o.videoKey)]) if (key) await storage.delete(key)
  for (const o of Object.values(p.outputs)) if (o.generationId) await deleteGeneration(o.generationId, workspaceId)
  await getDb().delete(schema.dubbingProject).where(eq(schema.dubbingProject.id, id))
}

/** SRT or VTT captions for the source ("source") or one target language. */
export async function dubCaptions(workspaceId: string, id: string, language: string, format: 'srt' | 'vtt') {
  const p = await getDub(workspaceId, id)
  const segs = language === 'source' ? p.segments : p.outputs[language]?.segments
  if (!segs) throw new UserError('unknown_language', errs().unknownLanguage, 404)
  const text = format === 'srt' ? toSrt(segs, { speakers: false }) : toVtt(segs, { speakers: false })
  return { text, filename: `${p.title.replace(/[^\w.-]+/g, '-').slice(0, 60) || 'dub'}-${language}.${format}` }
}
