import 'server-only'
import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import { getVoiceEngine, requireEngineFeature } from '@/server/engine'
import { getStorage } from '@/server/storage'
import { audit } from '@/server/audit'
import { newId } from '@/server/ids'
import { UserError } from '@/server/api/errors'
import { startGeneration, failGeneration, type Actor } from '@/server/generations'
import { matchesBlocklist } from '@/server/voices'
import { assertVoiceSlot, voiceView } from '@/server/modules/voices'
import { tagWav, fingerprint } from '@/server/provenance'
import { CREDIT_RATES } from '@/config/plans'
import { KOKORO_DESIGN_LANGUAGES } from '@/lib/voice/kokoro-design'
import { getMessages, fmt } from '@/i18n'
import type { DesignInput, DesignSaveInput } from '@/lib/schemas/design'
import type { EngineVoice, VoiceParams } from '@/lib/voice/types'

interface Candidate { params: VoiceParams; engineVoiceId: string | null; key: string; durationMs: number; peaks: number[]; labels?: EngineVoice['labels']; savedVoiceId?: string; savedName?: string }

const errs = () => getMessages('en').app.voices.errors

/**
 * Generates three candidate voices from a text description, each reading the same preview line.
 * One charge per set (CREDIT_RATES.voiceDesignPerPreviewSet). Candidates stay for 24 hours of history;
 * saving one as a voice is free.
 */
export async function designVoices(actor: Actor, input: DesignInput) {
  if (await matchesBlocklist(input.description)) throw new UserError('blocked_description', errs().blockedDescription, 422, { description: errs().blockedDescription })
  const engine = requireEngineFeature('design')
  if (engine.id === 'kokoro' && !KOKORO_DESIGN_LANGUAGES[input.language]) {
    const m = getMessages('en').errors.app.engine.designLanguage
    throw new UserError('design_language', m, 422, { language: m })
  }
  const text = input.previewText || getMessages('en').app.design.previewSentence
  const g = await startGeneration(actor, {
    module: 'design', units: 1, credits: CREDIT_RATES.voiceDesignPerPreviewSet,
    input: { description: input.description, text, language: input.language, traits: input.traits },
  })
  try {
    const voices = await engine.design({ description: input.description, count: 3, previewText: text, language: input.language, seed: g.id, traits: input.traits })
    const storage = await getStorage()
    const candidates: Candidate[] = []
    for (const [i, v] of voices.entries()) {
      const audio = v.preview ?? await engine.synthesize({ text, voice: v.params, engineVoiceId: v.engineVoiceId ?? null, language: input.language, seed: `${g.id}-${i}` })
      const bytes = audio.mimeType === 'audio/wav' ? tagWav(audio.audio, g.id) : audio.audio
      const key = `${actor.workspaceId}/gen/${g.id}-${i}.${audio.mimeType === 'audio/wav' ? 'wav' : 'mp3'}`
      await storage.put(key, bytes, audio.mimeType)
      candidates.push({ params: v.params, engineVoiceId: v.engineVoiceId ?? null, key, durationMs: audio.durationMs, peaks: audio.peaks, labels: v.labels })
    }
    const [row] = await getDb().update(schema.generation).set({
      status: 'succeeded', outputKey: candidates[0]!.key, outputMime: candidates[0]!.key.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg',
      durationMs: candidates[0]!.durationMs, input: { ...g.input, candidates }, fingerprint: fingerprint((await storage.get(candidates[0]!.key))!),
    }).where(eq(schema.generation.id, g.id)).returning()
    return designView(row!)
  } catch (err) {
    await failGeneration(g, (err as Error).message)
    throw err
  }
}

export async function designView(g: typeof schema.generation.$inferSelect) {
  const storage = await getStorage()
  const candidates = (g.input.candidates ?? []) as Candidate[]
  return {
    id: g.id, description: g.input.description as string, text: g.input.text as string, credits: g.credits, createdAt: g.createdAt,
    candidates: await Promise.all(candidates.map(async (c, i) => ({
      index: i, durationMs: c.durationMs, peaks: c.peaks, audioUrl: await storage.signedUrl(c.key),
      savedVoiceId: c.savedVoiceId ?? null,
    }))),
  }
}

/** Saves one candidate as a voice (no consent step: designed voices aren't anyone's real voice). */
export async function saveDesignedVoice(actor: Actor, input: DesignSaveInput) {
  const t = errs()
  const [g] = await getDb().select().from(schema.generation).where(and(eq(schema.generation.id, input.designId), eq(schema.generation.workspaceId, actor.workspaceId), eq(schema.generation.module, 'design')))
  const candidates = (g?.input.candidates ?? []) as Candidate[]
  const c = candidates[input.candidate]
  if (!g || g.status !== 'succeeded' || !c) throw new UserError('design_not_found', t.designNotFound, 404)
  if (c.savedVoiceId) throw new UserError('design_saved', fmt(t.designSaved, { name: c.savedName ?? '' }), 409)
  if (await matchesBlocklist(input.name)) throw new UserError('blocked_name', t.blockedName, 422, { name: t.blockedName })
  await assertVoiceSlot(actor.workspaceId)
  const engine = getVoiceEngine()
  const id = newId('voice')
  // Engines that make design candidates as drafts keep the chosen one now (the others expire there).
  const engineVoiceId = c.engineVoiceId && engine.publishVoice ? await engine.publishVoice(c.engineVoiceId, { name: input.name, description: input.description || undefined }) : c.engineVoiceId
  const [v] = await getDb().transaction(async (tx) => {
    const rows = await tx.insert(schema.voice).values({
      id, workspaceId: actor.workspaceId, ownerUserId: actor.userId, name: input.name, description: input.description || (g.input.description as string).slice(0, 500),
      kind: 'designed', status: 'active', licence: input.licence, params: c.params as unknown as Record<string, number>,
      engine: engine.id, engineVoiceId, language: (g.input.language as string) ?? 'en',
      // A Kokoro design is a Mixer recipe, so it can be mixed like any mix.
      mixRecipe: engine.id === 'kokoro' ? engineVoiceId : null,
      ...(c.labels?.gender ? { gender: c.labels.gender } : {}), ...(c.labels?.age ? { age: c.labels.age } : {}), ...(c.labels?.accent ? { accent: c.labels.accent } : {}),
    }).returning()
    candidates[input.candidate] = { ...c, savedVoiceId: id, savedName: input.name }
    await tx.update(schema.generation).set({ input: { ...g.input, candidates } }).where(eq(schema.generation.id, g.id))
    return rows
  })
  await audit({ actorId: actor.userId, action: 'voice.designed', targetType: 'voice', targetId: id, after: { designId: g.id, candidate: input.candidate } })
  return voiceView(v!, { workspaceId: actor.workspaceId })
}
