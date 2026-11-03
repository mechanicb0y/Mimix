import 'server-only'
import { createHash } from 'node:crypto'
import { and, asc, desc, eq, gt, inArray, sql } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import { engineForVoice, engineVoiceIdFor } from '@/server/engine'
import { createJob, registerJobHandler, type JobContext } from '@/server/jobs'
import { failGeneration, finishGeneration, startGeneration, type Actor, type GenerationRow } from '@/server/generations'
import { paramsOf, resolveVoiceForUse } from '@/server/voices'
import { workspacePlan } from '@/server/modules/voices'
import { listRules } from '@/server/modules/tts'
import { getStorage } from '@/server/storage'
import { concatWav, normaliseLoudness, toWav, wavDurationMs, wavToMp3 } from '@/server/audio'
import { getBalance, InsufficientCreditsError } from '@/server/credits'
import { newId } from '@/server/ids'
import { UserError } from '@/server/api/errors'
import { CREDIT_RATES, planHas } from '@/config/plans'
import { ENGINE_LIMITS } from '@/config/engine-limits'
import { applyPronunciation } from '@/lib/schemas/tts'
import { parseManuscript, type studioCreateSchema, type studioPatchSchema } from '@/lib/schemas/studio'
import { computePeaks, decodeWav, encodeWav } from '@/lib/voice/wav'
import { getMessages, fmt } from '@/i18n'
import type { z } from 'zod'

/**
 * Studio: long-form projects (audiobooks, podcasts) as chapters of blocks. Each block is voiced on
 * its own and its audio is kept until its text or voice changes, so fixing one line re-voices one
 * line. Voicing is charged per character at the speech rate; exporting stitches the saved audio,
 * normalises loudness for the format, and costs nothing extra.
 */
export type ProjectRow = typeof schema.studioProject.$inferSelect
export type ChapterRow = typeof schema.studioChapter.$inferSelect
export type BlockRow = typeof schema.studioBlock.$inferSelect

const errs = () => getMessages('en').errors.app.studio
const MAX_CHARS = () => ENGINE_LIMITS.studioProjectChars.value
const RATE = 24000
/** Silence between blocks, at the top of a file and at the end (ACX asks for 0.5–1 s and 1–5 s). */
const GAP_MS = 450
const HEAD_MS = 750
const TAIL_MS = 2000
/**
 * Loudness targets. Podcasts: -16 LUFS, -1.5 dBTP (common streaming target). Audiobooks: -20 LUFS
 * and -3 dBTP, inside ACX's -23 to -18 dB RMS and -3 dB peak requirements.
 */
const LOUDNESS = { podcast: { I: -16, TP: -1.5, LRA: 11 }, audiobook: { I: -20, TP: -3, LRA: 11 } } as const

async function assertStudio(workspaceId: string) {
  if (!planHas(await workspacePlan(workspaceId), 'studio')) throw new UserError('plan_feature', errs().notIncluded, 403)
}

export const effectiveVoice = (b: Pick<BlockRow, 'voiceId' | 'speaker'>, p: Pick<ProjectRow, 'cast' | 'defaultVoiceId'>) =>
  b.voiceId ?? (b.speaker ? p.cast[b.speaker] : undefined) ?? p.defaultVoiceId
const blockHash = (text: string, voiceId: string | null) => createHash('sha256').update(`${voiceId ?? ''}\u0000${text}`).digest('hex').slice(0, 24)
const isReady = (b: BlockRow, p: ProjectRow) => !!b.audioKey && b.audioHash === blockHash(b.text, effectiveVoice(b, p))

/* ------------------------------------------------------------------ projects */

export async function createProject(actor: Actor, input: z.infer<typeof studioCreateSchema>) {
  await assertStudio(actor.workspaceId)
  await resolveVoiceForUse(input.defaultVoiceId, actor.workspaceId)
  const id = newId('stu')
  await getDb().transaction(async (tx) => {
    await tx.insert(schema.studioProject).values({ id, workspaceId: actor.workspaceId, title: input.title, kind: input.kind, defaultVoiceId: input.defaultVoiceId })
    await tx.insert(schema.studioChapter).values({ id: newId('chp'), projectId: id, position: 0, title: getMessages('en').app.studio.firstChapter })
  })
  return projectView(actor.workspaceId, id)
}

export async function getProject(workspaceId: string, id: string): Promise<ProjectRow> {
  const [p] = await getDb().select().from(schema.studioProject).where(and(eq(schema.studioProject.id, id), eq(schema.studioProject.workspaceId, workspaceId)))
  if (!p) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  return p
}

export async function listProjects(workspaceId: string) {
  const db = getDb()
  const rows = await db.select().from(schema.studioProject).where(eq(schema.studioProject.workspaceId, workspaceId)).orderBy(desc(schema.studioProject.updatedAt)).limit(100)
  if (!rows.length) return []
  const stats = await db.select({
    projectId: schema.studioChapter.projectId,
    chapters: sql<number>`count(distinct ${schema.studioChapter.id})::int`,
    chars: sql<number>`coalesce(sum(length(${schema.studioBlock.text})), 0)::int`,
  }).from(schema.studioChapter).leftJoin(schema.studioBlock, eq(schema.studioBlock.chapterId, schema.studioChapter.id))
    .where(inArray(schema.studioChapter.projectId, rows.map((r) => r.id))).groupBy(schema.studioChapter.projectId)
  const by = new Map(stats.map((s) => [s.projectId, s]))
  return rows.map((p) => ({ id: p.id, title: p.title, kind: p.kind, chapters: by.get(p.id)?.chapters ?? 0, characters: by.get(p.id)?.chars ?? 0, updatedAt: p.updatedAt, createdAt: p.createdAt }))
}

async function chaptersOf(projectId: string) {
  return getDb().select().from(schema.studioChapter).where(eq(schema.studioChapter.projectId, projectId)).orderBy(asc(schema.studioChapter.position))
}
async function blocksOf(chapterIds: string[]) {
  if (!chapterIds.length) return []
  return getDb().select().from(schema.studioBlock).where(inArray(schema.studioBlock.chapterId, chapterIds)).orderBy(asc(schema.studioBlock.position))
}
async function projectChars(projectId: string, exceptBlockId?: string) {
  const [r] = await getDb().select({ n: sql<number>`coalesce(sum(length(${schema.studioBlock.text})), 0)::int` }).from(schema.studioBlock)
    .innerJoin(schema.studioChapter, eq(schema.studioChapter.id, schema.studioBlock.chapterId))
    .where(and(eq(schema.studioChapter.projectId, projectId), exceptBlockId ? sql`${schema.studioBlock.id} <> ${exceptBlockId}` : sql`true`))
  return r?.n ?? 0
}
function assertChars(total: number) {
  if (total > MAX_CHARS()) throw new UserError('project_too_long', fmt(errs().tooLong, { max: MAX_CHARS().toLocaleString('en-US'), count: total.toLocaleString('en-US') }), 422)
}
async function touch(projectId: string) {
  await getDb().update(schema.studioProject).set({ updatedAt: new Date() }).where(eq(schema.studioProject.id, projectId))
}
async function exporting(projectId: string) {
  const [j] = await getDb().select({ id: schema.job.id }).from(schema.job)
    .where(and(eq(schema.job.type, 'studio_export'), inArray(schema.job.status, ['queued', 'running']), sql`${schema.job.input}->>'projectId' = ${projectId}`)).limit(1)
  return j?.id ?? null
}

export async function projectView(workspaceId: string, id: string) {
  const p = await getProject(workspaceId, id)
  const chapters = await chaptersOf(id)
  const blocks = await blocksOf(chapters.map((c) => c.id))
  const storage = await getStorage()
  const exports = await getDb().select().from(schema.generation)
    .where(and(eq(schema.generation.workspaceId, workspaceId), eq(schema.generation.module, 'studio_export'), eq(schema.generation.status, 'succeeded'), sql`${schema.generation.input}->>'projectId' = ${id}`))
    .orderBy(desc(schema.generation.createdAt)).limit(50)
  const latest = new Map<string, GenerationRow>()
  for (const g of exports) { const k = String(g.input.chapterId ?? 'all'); if (!latest.has(k)) latest.set(k, g) }
  const speakers = [...new Set([...Object.keys(p.cast), ...blocks.map((b) => b.speaker).filter((s): s is string => !!s)])]
  const fileName = (g: GenerationRow) => `${String(g.input.title ?? p.title).replace(/[^\w.]+/g, '-').slice(0, 80) || 'studio'}.mp3`
  return {
    id: p.id, title: p.title, kind: p.kind, defaultVoiceId: p.defaultVoiceId, cast: p.cast, speakers, createdAt: p.createdAt, updatedAt: p.updatedAt,
    characters: blocks.reduce((n, b) => n + b.text.length, 0), maxCharacters: MAX_CHARS(), exportJobId: await exporting(id),
    staleCharacters: blocks.reduce((n, b) => n + (b.text.trim() && !isReady(b, p) ? b.text.length : 0), 0),
    chapters: await Promise.all(chapters.map(async (c) => {
      const g = latest.get(c.id)
      return {
        id: c.id, title: c.title, position: c.position,
        blocks: await Promise.all(blocks.filter((b) => b.chapterId === c.id).map((b) => blockView(b, p, storage))),
        export: g ? { generationId: g.id, createdAt: g.createdAt, durationMs: g.durationMs, audioUrl: await storage.signedUrl(g.outputKey!), downloadUrl: await storage.signedUrl(g.outputKey!, { downloadName: fileName(g) }) } : null,
      }
    })),
    fullExport: latest.get('all') ? await (async (g: GenerationRow) => ({ generationId: g.id, createdAt: g.createdAt, durationMs: g.durationMs, audioUrl: await storage.signedUrl(g.outputKey!), downloadUrl: await storage.signedUrl(g.outputKey!, { downloadName: fileName(g) }) }))(latest.get('all')!) : null,
  }
}

async function blockView(b: BlockRow, p: ProjectRow, storage: Awaited<ReturnType<typeof getStorage>>) {
  const ready = isReady(b, p)
  return {
    id: b.id, chapterId: b.chapterId, position: b.position, text: b.text, speaker: b.speaker, voiceId: b.voiceId, effectiveVoiceId: effectiveVoice(b, p),
    status: !b.text.trim() ? 'empty' as const : ready ? 'ready' as const : 'stale' as const,
    audioUrl: ready && b.audioKey ? await storage.signedUrl(b.audioKey) : null,
  }
}

export async function patchProject(workspaceId: string, id: string, input: z.infer<typeof studioPatchSchema>) {
  const p = await getProject(workspaceId, id)
  const patch: Partial<typeof schema.studioProject.$inferInsert> = { updatedAt: new Date() }
  if (input.title) patch.title = input.title
  if (input.kind) patch.kind = input.kind
  if (input.defaultVoiceId) { await resolveVoiceForUse(input.defaultVoiceId, workspaceId); patch.defaultVoiceId = input.defaultVoiceId }
  if (input.cast) {
    const cast = { ...p.cast }
    for (const [speaker, voiceId] of Object.entries(input.cast)) {
      if (voiceId === null) delete cast[speaker]
      else { await resolveVoiceForUse(voiceId, workspaceId); cast[speaker] = voiceId }
    }
    patch.cast = cast
  }
  await getDb().update(schema.studioProject).set(patch).where(eq(schema.studioProject.id, id))
  return projectView(workspaceId, id)
}

export async function deleteProject(workspaceId: string, id: string) {
  await getProject(workspaceId, id)
  if (await exporting(id)) throw new UserError('busy', errs().busy, 409)
  const chapters = await chaptersOf(id)
  const storage = await getStorage()
  for (const b of await blocksOf(chapters.map((c) => c.id))) if (b.audioKey) await storage.delete(b.audioKey)
  await getDb().delete(schema.studioProject).where(eq(schema.studioProject.id, id))
}

/* ------------------------------------------------------------------ import, chapters, blocks */

export async function importText(workspaceId: string, id: string, input: { text: string; mode: 'append' | 'replace' }) {
  const p = await getProject(workspaceId, id)
  if (await exporting(id)) throw new UserError('busy', errs().busy, 409)
  const parsed = parseManuscript(input.text, fmt(getMessages('en').app.studio.chapterN, { n: 1 }))
  const adding = parsed.reduce((n, c) => n + c.blocks.reduce((m, b) => m + b.text.length, 0), 0)
  assertChars((input.mode === 'replace' ? 0 : await projectChars(id)) + adding)
  const existing = await chaptersOf(id)
  // An untouched starter chapter (no blocks) is replaced by the first imported one.
  const starter = existing.length === 1 && !(await blocksOf([existing[0]!.id])).length ? existing[0]! : null
  const storage = await getStorage()
  if (input.mode === 'replace') for (const b of await blocksOf(existing.map((c) => c.id))) if (b.audioKey) await storage.delete(b.audioKey)
  await getDb().transaction(async (tx) => {
    if (input.mode === 'replace' || starter) await tx.delete(schema.studioChapter).where(eq(schema.studioChapter.projectId, id))
    let pos = input.mode === 'replace' || starter ? 0 : (existing.at(-1)?.position ?? -1) + 1
    for (const c of parsed) {
      const chapterId = newId('chp')
      await tx.insert(schema.studioChapter).values({ id: chapterId, projectId: id, position: pos++, title: c.title })
      if (c.blocks.length) await tx.insert(schema.studioBlock).values(c.blocks.map((b, i) => ({ id: newId('blk'), chapterId, position: i, text: b.text, speaker: b.speaker })))
    }
    await tx.update(schema.studioProject).set({ updatedAt: new Date() }).where(eq(schema.studioProject.id, p.id))
  })
  return projectView(workspaceId, id)
}

async function chapterOf(workspaceId: string, chapterId: string) {
  const [c] = await getDb().select().from(schema.studioChapter).where(eq(schema.studioChapter.id, chapterId))
  if (!c) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  const p = await getProject(workspaceId, c.projectId)
  return { c, p }
}

export async function createChapter(workspaceId: string, projectId: string, input: { title: string; afterId?: string }) {
  await getProject(workspaceId, projectId)
  const chapters = await chaptersOf(projectId)
  const after = input.afterId ? chapters.find((c) => c.id === input.afterId) : chapters.at(-1)
  const pos = after ? after.position + 1 : 0
  await getDb().transaction(async (tx) => {
    await tx.update(schema.studioChapter).set({ position: sql`${schema.studioChapter.position} + 1` }).where(and(eq(schema.studioChapter.projectId, projectId), gt(schema.studioChapter.position, pos - 1)))
    await tx.insert(schema.studioChapter).values({ id: newId('chp'), projectId, position: pos, title: input.title })
  })
  await touch(projectId)
  return projectView(workspaceId, projectId)
}

export async function patchChapter(workspaceId: string, chapterId: string, input: { title?: string; move?: 'up' | 'down' }) {
  const { c, p } = await chapterOf(workspaceId, chapterId)
  if (input.title) await getDb().update(schema.studioChapter).set({ title: input.title }).where(eq(schema.studioChapter.id, chapterId))
  if (input.move) {
    const chapters = await chaptersOf(p.id)
    const i = chapters.findIndex((x) => x.id === c.id)
    const other = chapters[input.move === 'up' ? i - 1 : i + 1]
    if (other) await getDb().transaction(async (tx) => {
      await tx.update(schema.studioChapter).set({ position: other.position }).where(eq(schema.studioChapter.id, c.id))
      await tx.update(schema.studioChapter).set({ position: c.position }).where(eq(schema.studioChapter.id, other.id))
    })
  }
  await touch(p.id)
  return projectView(workspaceId, p.id)
}

export async function deleteChapter(workspaceId: string, chapterId: string) {
  const { p } = await chapterOf(workspaceId, chapterId)
  if ((await chaptersOf(p.id)).length <= 1) throw new UserError('last_chapter', errs().lastChapter, 409)
  const storage = await getStorage()
  for (const b of await blocksOf([chapterId])) if (b.audioKey) await storage.delete(b.audioKey)
  await getDb().delete(schema.studioChapter).where(eq(schema.studioChapter.id, chapterId))
  await touch(p.id)
  return projectView(workspaceId, p.id)
}

async function blockOf(workspaceId: string, blockId: string) {
  const [b] = await getDb().select().from(schema.studioBlock).where(eq(schema.studioBlock.id, blockId))
  if (!b) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  const { c, p } = await chapterOf(workspaceId, b.chapterId)
  return { b, c, p }
}

export async function createBlock(workspaceId: string, input: { chapterId: string; afterId?: string; text: string; speaker?: string }) {
  const { p } = await chapterOf(workspaceId, input.chapterId)
  assertChars((await projectChars(p.id)) + input.text.length)
  const blocks = await blocksOf([input.chapterId])
  const after = input.afterId ? blocks.find((b) => b.id === input.afterId) : blocks.at(-1)
  const pos = after ? after.position + 1 : 0
  const id = newId('blk')
  await getDb().transaction(async (tx) => {
    await tx.update(schema.studioBlock).set({ position: sql`${schema.studioBlock.position} + 1` }).where(and(eq(schema.studioBlock.chapterId, input.chapterId), gt(schema.studioBlock.position, pos - 1)))
    await tx.insert(schema.studioBlock).values({ id, chapterId: input.chapterId, position: pos, text: input.text, speaker: input.speaker ?? after?.speaker ?? null })
  })
  await touch(p.id)
  const [b] = await getDb().select().from(schema.studioBlock).where(eq(schema.studioBlock.id, id))
  return blockView(b!, p, await getStorage())
}

export async function patchBlock(workspaceId: string, blockId: string, input: { text?: string; speaker?: string | null; voiceId?: string | null }) {
  const { b, p } = await blockOf(workspaceId, blockId)
  const patch: Partial<typeof schema.studioBlock.$inferInsert> = { updatedAt: new Date() }
  if (input.text !== undefined) { assertChars((await projectChars(p.id, b.id)) + input.text.length); patch.text = input.text }
  if (input.speaker !== undefined) patch.speaker = input.speaker
  if (input.voiceId !== undefined) { if (input.voiceId) await resolveVoiceForUse(input.voiceId, workspaceId); patch.voiceId = input.voiceId }
  const [row] = await getDb().update(schema.studioBlock).set(patch).where(eq(schema.studioBlock.id, blockId)).returning()
  await touch(p.id)
  return blockView(row!, p, await getStorage())
}

export async function deleteBlock(workspaceId: string, blockId: string) {
  const { b, p } = await blockOf(workspaceId, blockId)
  if (b.audioKey) await (await getStorage()).delete(b.audioKey)
  await getDb().delete(schema.studioBlock).where(eq(schema.studioBlock.id, blockId))
  await touch(p.id)
}

/* ------------------------------------------------------------------ voicing and export */

/** Voices one block now (or returns it as is when its audio is current). Charged per character. */
export async function generateBlock(actor: Actor, blockId: string) {
  const { b, p } = await blockOf(actor.workspaceId, blockId)
  await assertStudio(actor.workspaceId)
  if (!b.text.trim()) throw new UserError('empty_block', errs().emptyBlock, 422)
  const done = isReady(b, p) ? b : await voiceBlock(actor, b, p)
  return blockView(done, p, await getStorage())
}

async function voiceBlock(actor: Actor, b: BlockRow, p: ProjectRow, rules?: Awaited<ReturnType<typeof listRules>>): Promise<BlockRow> {
  const voiceId = effectiveVoice(b, p)
  if (!voiceId) throw new UserError('voice_required', getMessages('en').app.validation.voiceRequired, 422)
  const voice = await resolveVoiceForUse(voiceId, p.workspaceId)
  const engine = engineForVoice(voice)
  const g = await startGeneration(actor, {
    module: 'studio', units: b.text.length, credits: b.text.length * CREDIT_RATES.ttsPerCharacter, voiceId,
    input: { text: b.text, projectId: p.id, blockId: b.id },
  })
  let done: GenerationRow
  try {
    const spoken = applyPronunciation(b.text, rules ?? await listRules(p.workspaceId))
    const audio = await engine.synthesize({ text: spoken, voice: paramsOf(voice), engineVoiceId: engineVoiceIdFor(voice, engine), seed: g.id })
    done = await finishGeneration(g, audio, 'mp3')
  } catch (e) {
    await failGeneration(g, (e as Error).message)
    throw e
  }
  const storage = await getStorage()
  if (b.audioKey && b.audioKey !== done.outputKey) await storage.delete(b.audioKey)
  const [row] = await getDb().update(schema.studioBlock).set({ audioKey: done.outputKey, audioHash: blockHash(b.text, voiceId) }).where(eq(schema.studioBlock.id, b.id)).returning()
  return row!
}

export async function queueExport(actor: Actor, projectId: string, chapterId?: string) {
  await assertStudio(actor.workspaceId)
  const p = await getProject(actor.workspaceId, projectId)
  if (await exporting(projectId)) throw new UserError('busy', errs().busy, 409)
  const chapters = (await chaptersOf(projectId)).filter((c) => !chapterId || c.id === chapterId)
  if (chapterId && !chapters.length) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  const blocks = (await blocksOf(chapters.map((c) => c.id))).filter((b) => b.text.trim())
  if (!blocks.length) throw new UserError('nothing_to_export', errs().nothingToExport, 422)
  const credits = blocks.reduce((n, b) => n + (isReady(b, p) ? 0 : b.text.length), 0) * CREDIT_RATES.ttsPerCharacter
  const bal = await getBalance(actor.workspaceId)
  if (!bal.unlimited && bal.total < credits) throw new InsufficientCreditsError(credits, bal.total)
  return createJob({ workspaceId: actor.workspaceId, userId: actor.userId, type: 'studio_export', input: { projectId, chapterId: chapterId ?? null, title: p.title, apiKeyId: actor.apiKeyId } })
}

registerJobHandler('studio_export', async (ctx: JobContext) => {
  const { projectId, chapterId, apiKeyId } = ctx.job.input as { projectId: string; chapterId: string | null; apiKeyId?: string | null }
  const actor: Actor = { workspaceId: ctx.job.workspaceId, userId: ctx.job.userId, apiKeyId: apiKeyId ?? null }
  const p = await getProject(actor.workspaceId, projectId)
  const chapters = (await chaptersOf(projectId)).filter((c) => !chapterId || c.id === chapterId)
  const blocks = (await blocksOf(chapters.map((c) => c.id))).filter((b) => b.text.trim())
  const rules = await listRules(p.workspaceId)
  const storage = await getStorage()

  // 1. Voice whatever changed since the last time (charged per block, kept even if a later step fails).
  const stale = blocks.filter((b) => !isReady(b, p))
  const fresh = new Map<string, BlockRow>()
  for (const [i, b] of stale.entries()) {
    await ctx.checkCancelled()
    await ctx.progress(5 + Math.round((i / Math.max(1, stale.length)) * 60), 'voicing')
    fresh.set(b.id, await voiceBlock(actor, b, p, rules))
  }

  // 2. Stitch, normalise and store: one file per chapter for audiobooks, one file for a podcast episode.
  await ctx.progress(70, 'mixing')
  const silence = (ms: number) => encodeWav(new Float32Array(Math.round((ms / 1000) * RATE)), RATE)
  const wavOf = async (bs: BlockRow[]) => {
    const clips: Uint8Array[] = []
    for (const b of bs) {
      const key = (fresh.get(b.id) ?? b).audioKey
      const bytes = key ? await storage.get(key) : null
      if (bytes) clips.push(await toWav(bytes, RATE))
    }
    return concatWav([silence(HEAD_MS), concatWav(clips, GAP_MS), silence(TAIL_MS)])
  }
  const files = !chapterId && p.kind === 'podcast'
    ? [{ chapterId: null as string | null, title: p.title, blocks }]
    : chapters.map((c) => ({ chapterId: c.id as string | null, title: `${p.title} - ${c.title}`, blocks: blocks.filter((b) => b.chapterId === c.id) })).filter((f) => f.blocks.length)
  const out: string[] = []
  for (const [i, f] of files.entries()) {
    await ctx.checkCancelled()
    await ctx.progress(70 + Math.round((i / files.length) * 28), 'mixing')
    const wav = await normaliseLoudness(await wavOf(f.blocks), LOUDNESS[p.kind])
    const mp3 = await wavToMp3(wav, 192)
    const g = await startGeneration(actor, { module: 'studio_export', units: 0, credits: 0, input: { projectId, chapterId: f.chapterId, title: f.title, kind: p.kind } })
    const done = await finishGeneration(g, { audio: mp3, mimeType: 'audio/mpeg', sampleRate: 44100, durationMs: wavDurationMs(wav), peaks: computePeaks(decodeWav(wav).samples) }, 'mp3')
    out.push(done.id)
  }
  return { projectId, generationIds: out, voicedBlocks: stale.length }
})
