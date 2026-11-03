import 'server-only'
import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import { engineForSpeech, engineVoiceIdFor, getVoiceEngine, modelFor } from '@/server/engine'
import { getMessages } from '@/i18n'
import { applyPronunciation, ttsCredits, type TtsInput, type PronunciationRuleInput } from '@/lib/schemas/tts'
import { failGeneration, finishGeneration, generationView, startGeneration, type Actor } from '@/server/generations'
import { paramsOf, resolveVoiceForUse } from '@/server/voices'
import { newId } from '@/server/ids'
import { UserError } from '@/server/api/errors'
import { getBalance, InsufficientCreditsError } from '@/server/credits'
import { createJob, registerJobHandler } from '@/server/jobs'
import type { GenerationRow } from '@/server/generations'

/** Synthesises one take, stores it and returns the generation with signed URLs. */
export async function generateSpeech(actor: Actor, input: TtsInput, onStart?: (g: GenerationRow) => Promise<void>) {
  const voice = await resolveVoiceForUse(input.voiceId, actor.workspaceId)
  const engine = engineForSpeech(voice, input.language)
  if (input.model && !getVoiceEngine().capabilities.models.some((m) => m.id === input.model) && !engine.capabilities.models.some((m) => m.id === input.model)) {
    const m = getMessages('en').errors.app.modelNotFound
    throw new UserError('model_not_found', m.message, 422, { model: m.field })
  }
  // Mixer voices read on the mixer engine, which has its own model.
  const model = modelFor(engine, input.model)
  const rules = input.pronunciation ? await listRules(actor.workspaceId) : []
  const spoken = applyPronunciation(input.text, rules)
  const g = await startGeneration(actor, {
    module: 'tts', units: input.text.length, credits: ttsCredits(input.text), voiceId: voice.id, model,
    input: { text: input.text, settings: input.settings, format: input.format, language: input.language ?? null, pronunciation: input.pronunciation },
  })
  try {
    await onStart?.(g)
    const audio = await engine.synthesize({
      text: spoken, voice: paramsOf(voice), engineVoiceId: engineVoiceIdFor(voice, engine),
      model, language: input.language, settings: input.settings, seed: input.seed ?? g.id,
    })
    return generationView(await finishGeneration(g, audio, input.format))
  } catch (err) {
    await failGeneration(g, (err as Error).message)
    throw err
  }
}

/**
 * Queues one take as a job (the app's Speech page), so it keeps going if the person changes page or
 * closes the tab. The voice, model and credits are checked now, so mistakes show at once.
 */
export async function queueSpeech(actor: Actor, input: TtsInput) {
  const voice = await resolveVoiceForUse(input.voiceId, actor.workspaceId)
  const engine = engineForSpeech(voice, input.language)
  if (input.model && !getVoiceEngine().capabilities.models.some((m) => m.id === input.model) && !engine.capabilities.models.some((m) => m.id === input.model)) {
    const m = getMessages('en').errors.app.modelNotFound
    throw new UserError('model_not_found', m.message, 422, { model: m.field })
  }
  const credits = ttsCredits(input.text)
  const b = await getBalance(actor.workspaceId)
  if (!b.unlimited && b.total < credits) throw new InsufficientCreditsError(credits, b.total)
  const title = input.text.replace(/\s+/g, ' ').trim().slice(0, 60)
  return createJob({ workspaceId: actor.workspaceId, userId: actor.userId, type: 'tts', input: { tts: input, title, apiKeyId: actor.apiKeyId } })
}

registerJobHandler('tts', async (ctx) => {
  const { tts, apiKeyId } = ctx.job.input as { tts: TtsInput; apiKeyId?: string | null }
  await ctx.progress(5, 'speaking')
  const view = await generateSpeech({ workspaceId: ctx.job.workspaceId, userId: ctx.job.userId, apiKeyId: apiKeyId ?? null }, tts, async (g) => {
    // Linked, so cancelling or failing the job refunds the take.
    await getDb().update(schema.job).set({ generationId: g.id }).where(eq(schema.job.id, ctx.job.id))
    ctx.job.generationId = g.id
  })
  return { generationId: view.id }
})

export async function listRules(workspaceId: string) {
  return getDb().select().from(schema.pronunciationRule).where(eq(schema.pronunciationRule.workspaceId, workspaceId)).orderBy(schema.pronunciationRule.term)
}

export async function upsertRule(workspaceId: string, input: PronunciationRuleInput) {
  const [row] = await getDb().insert(schema.pronunciationRule).values({ id: newId('pr'), workspaceId, ...input })
    .onConflictDoUpdate({ target: [schema.pronunciationRule.workspaceId, schema.pronunciationRule.term], set: { type: input.type, replacement: input.replacement, caseSensitive: input.caseSensitive } })
    .returning()
  return row!
}

export async function deleteRule(workspaceId: string, id: string) {
  const r = await getDb().delete(schema.pronunciationRule).where(and(eq(schema.pronunciationRule.id, id), eq(schema.pronunciationRule.workspaceId, workspaceId))).returning({ id: schema.pronunciationRule.id })
  return r.length > 0
}

/** Imports rules from a PLS-like CSV: term,replacement[,ipa] per line. */
export function parseRulesCsv(csv: string): PronunciationRuleInput[] {
  return csv.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).slice(0, 500).map((line) => {
    const [term = '', replacement = '', type = 'alias'] = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    return { term, replacement, type: type === 'ipa' ? 'ipa' as const : 'alias' as const, caseSensitive: false }
  }).filter((r) => r.term && r.replacement)
}
