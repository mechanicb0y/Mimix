import 'server-only'
import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import { engineVoiceIdFor, getMixerEngine, getVoiceEngine, mixerNeedsRecipes, mixRecipeOf, requireMixer } from '@/server/engine'
import { env } from '@/server/env'
import { createJob, registerJobHandler } from '@/server/jobs'
import { getStorage } from '@/server/storage'
import { parseRecipe } from '@/lib/voice/kokoro-engine'
import { speakerEmbedding } from '@/server/speaker'
import { ENGINE_LIMITS } from '@/config/engine-limits'
import { chargeCredits } from '@/server/credits'
import { audit } from '@/server/audit'
import { newId } from '@/server/ids'
import { UserError } from '@/server/api/errors'
import { getMessages, fmt } from '@/i18n'
import { CREDIT_RATES } from '@/config/plans'
import { ancestors, canMix, ensureLibrarySeeded, matchesBlocklist, mostRestrictive, paramsOf, STRICTNESS, type VoiceRow } from '@/server/voices'
import { assertVoiceSlot, getVoiceRow, voiceView, workspacePlan } from '@/server/modules/voices'
import type { MixSaveInput, MixSourcesInput } from '@/lib/schemas/mixer'
import type { Actor } from '@/server/generations'

/** The fixed sentence every preview reads, so only the blend changes between listens. */
export const MIX_PREVIEW_SENTENCE = () => getMessages('en').mixer.playground.sentence

/**
 * Loads and checks the sources: each must be owned by the workspace or public with a remix licence,
 * active, and (for mixes of mixes) still backed by active ancestors. The plan caps the source count.
 */
async function resolveSources(workspaceId: string, input: MixSourcesInput): Promise<Array<{ voice: VoiceRow; weight: number }>> {
  await ensureLibrarySeeded()
  const t = getMessages('en').app.voices.errors
  const plan = await workspacePlan(workspaceId)
  if (input.sources.length > plan.mixerSources) {
    throw new UserError('mixer_source_limit', fmt(t.tooManySources, { limit: plan.mixerSources }), 403, { sources: fmt(t.tooManySources, { limit: plan.mixerSources }) })
  }
  const out: Array<{ voice: VoiceRow; weight: number }> = []
  for (const [i, s] of input.sources.entries()) {
    const v = await getVoiceRow(s.voiceId)
    const visible = v && v.status !== 'deleted' && (v.workspaceId === workspaceId || v.workspaceId === null || v.publishStatus === 'approved')
    if (!v || !visible) throw new UserError('voice_not_found', t.notFound, 404, { [`sources.${i}.voiceId`]: t.notFound })
    if (!canMix(v, workspaceId)) {
      const msg = fmt(t.notMixable, { name: v.name })
      throw new UserError('voice_not_mixable', msg, 403, { [`sources.${i}.voiceId`]: msg })
    }
    // Mixer v1 (Kokoro) blends recipes: library voices and mixes of them. Clones come later.
    if (mixerNeedsRecipes() && !mixRecipeOf(v)) {
      const msg = fmt(t.mixOwnLater, { name: v.name })
      throw new UserError('voice_not_mixable_yet', msg, 422, { [`sources.${i}.voiceId`]: msg })
    }
    if (v.kind === 'mixed' && (await ancestors(v.id)).some((a) => a.status !== 'active')) {
      throw new UserError('voice_source_removed', t.sourceRemoved, 410, { [`sources.${i}.voiceId`]: t.sourceRemoved })
    }
    out.push({ voice: v, weight: s.weight })
  }
  return out
}

async function blend(workspaceId: string, input: MixSourcesInput) {
  const engine = requireMixer()
  const sources = await resolveSources(workspaceId, input)
  const mixed = await engine.mix({
    sources: sources.map((s) => ({
      voice: paramsOf(s.voice), weight: s.weight,
      // The Kokoro mixer reads each source's recipe; other engines read their own voice ids.
      engineVoiceId: engine.id === 'kokoro' ? mixRecipeOf(s.voice) : engineVoiceIdFor(s.voice, engine),
    })),
    adjust: input.adjust,
  })
  return { sources, mixed, engine }
}

/** Free preview of a blend on the fixed sentence. Not stored; rate limited by the API layer. */
export async function previewMix(actor: Actor, input: MixSourcesInput) {
  const { mixed, engine } = await blend(actor.workspaceId, input)
  const seed = `mix-${input.sources.map((s) => `${s.voiceId}:${s.weight.toFixed(3)}`).join('|')}`
  return engine.synthesize({ text: MIX_PREVIEW_SENTENCE(), voice: mixed.params, engineVoiceId: mixed.engineVoiceId ?? null, seed })
}

/**
 * Saves a blend as a new voice with its lineage. The licence defaults to, and may never be more open
 * than, the most restrictive licence among the sources. Charges CREDIT_RATES.mixerSave in the same
 * transaction that creates the voice, so a failed save charges nothing.
 */
export async function saveMix(actor: Actor, input: MixSaveInput) {
  const t = getMessages('en').app.voices.errors
  if (await matchesBlocklist(input.name)) throw new UserError('blocked_name', t.blockedName, 422, { name: t.blockedName })
  await assertVoiceSlot(actor.workspaceId)
  const { sources, mixed, engine } = await blend(actor.workspaceId, input)
  const floor = mostRestrictive(sources.map((s) => s.voice.licence))
  const licence = input.licence ?? floor
  if (STRICTNESS[licence] < STRICTNESS[floor]) throw new UserError('licence_too_open', t.licenceFloor, 422, { licence: t.licenceFloor })
  const lead = [...sources].sort((a, b) => b.weight - a.weight)[0]!.voice
  const id = newId('voice')
  const row = await getDb().transaction(async (tx) => {
    const [v] = await tx.insert(schema.voice).values({
      id, workspaceId: actor.workspaceId, ownerUserId: actor.userId, name: input.name, description: input.description,
      kind: 'mixed', status: 'active', licence, params: mixed.params as unknown as Record<string, number>,
      engine: engine.id, engineVoiceId: mixed.engineVoiceId ?? null,
      mixRecipe: engine.id === 'kokoro' ? (mixed.engineVoiceId ?? null) : null,
      promoteStatus: promotes(engine.id) ? 'pending' : null,
      language: lead.language, accent: lead.accent, gender: lead.gender, age: lead.age, useCase: lead.useCase,
    }).returning()
    await tx.insert(schema.voiceLineage).values(sources.map((s) => ({ mixVoiceId: id, sourceVoiceId: s.voice.id, weight: s.weight })))
    await chargeCredits({ workspaceId: actor.workspaceId, credits: CREDIT_RATES.mixerSave, module: 'mix_save', refId: id, actorId: actor.userId, tx })
    return v!
  })
  await audit({
    actorId: actor.userId, action: 'voice.mixed', targetType: 'voice', targetId: id,
    after: { sources: sources.map((s) => ({ id: s.voice.id, weight: s.weight })), adjust: input.adjust, licence },
  })
  if (row.promoteStatus === 'pending') await createJob({ workspaceId: actor.workspaceId, userId: actor.userId, type: 'mix_promote', input: { voiceId: id } })
  return { ...(await voiceView(row, { workspaceId: actor.workspaceId })), credits: CREDIT_RATES.mixerSave, lineage: await lineageOf(id) }
}

/** Direct sources of a mix with their weights, for the voice detail page. */
export async function lineageOf(voiceId: string) {
  const rows = await getDb().select({ id: schema.voice.id, name: schema.voice.name, status: schema.voice.status, weight: schema.voiceLineage.weight })
    .from(schema.voiceLineage).innerJoin(schema.voice, eq(schema.voice.id, schema.voiceLineage.sourceVoiceId))
    .where(eq(schema.voiceLineage.mixVoiceId, voiceId))
  return rows.sort((a, b) => b.weight - a.weight)
}

/* ------------------------------------------------------------------ mix, then clone */

/** About 30 seconds of a new mix's speech: the reference for the main engine's instant clone. */
export const PROMOTE_SCRIPT = () => getMessages('en').app.mixer.promoteScript

/** Whether a mix saved on this engine is also cloned onto the main engine (MIX_CLONE_TO_MAIN). */
function promotes(mixEngineId: string): boolean {
  return mixEngineId === 'kokoro' && env().MIX_CLONE_TO_MAIN && getVoiceEngine().id !== 'kokoro' && getVoiceEngine().capabilities.instantClone
}

/**
 * "Mix, then clone": renders PROMOTE_SCRIPT with the mix on the Kokoro mixer and gives it to the main
 * engine's instant clone, so the mix gains the main engine's quality and languages. The mix keeps its
 * recipe, so it can still be mixed again.
 *
 * Consent gate: this is a system-made reference, not a person's recording. It is allowed only when
 * every voice in the mix's lineage is synthetic: Kokoro library voices, or mixes of them. Nothing a
 * user uploads can reach this path; the audio is made here, on the server, from the recipe.
 */
export async function promoteMix(voiceId: string): Promise<{ voiceId: string; engine: string }> {
  const db = getDb()
  const [v] = await db.select().from(schema.voice).where(eq(schema.voice.id, voiceId))
  const recipe = v?.mixRecipe
  if (!v || v.kind !== 'mixed' || v.status !== 'active' || !parseRecipe(recipe)) throw new UserError('voice_not_found', getMessages('en').app.voices.errors.notFound, 404)
  const lineage = await ancestors(v.id)
  if (!lineage.length || !lineage.every(isSyntheticSource)) {
    throw new UserError('reference_not_synthetic', getMessages('en').errors.app.referenceNotSynthetic, 403)
  }
  const mixer = getMixerEngine()
  const main = getVoiceEngine()
  if (!mixer || mixer.id !== 'kokoro' || !main.capabilities.instantClone) throw new UserError('engine_unsupported', getMessages('en').errors.app.mixUpgradeUnavailable, 501)

  const reference = await mixer.synthesize({ text: PROMOTE_SCRIPT(), voice: paramsOf(v), engineVoiceId: recipe!, seed: `promote-${v.id}` })
  // The same floor as a person's upload: enough clear speech for an instant clone.
  const voicedMs = speakerEmbedding(reference.audio).voicedMs
  if (voicedMs < ENGINE_LIMITS.cloneInstantMinSeconds.value * 1000) throw new UserError('reference_too_short', getMessages('en').errors.app.mixUpgradeUnavailable, 422)
  const made = await main.clone({ samples: [reference.audio], name: v.name, kind: 'instant', language: v.language })
  const updated = await db.update(schema.voice).set({ engine: main.id, engineVoiceId: made.engineVoiceId ?? null, promoteStatus: 'done', previewKey: null })
    .where(and(eq(schema.voice.id, v.id), eq(schema.voice.status, 'active'))).returning({ id: schema.voice.id })
  if (!updated.length) {
    // Deleted or taken down while cloning: remove the new engine copy again.
    if (made.engineVoiceId) await main.deleteVoice(made.engineVoiceId).catch(() => {})
    return { voiceId, engine: 'kokoro' }
  }
  if (v.previewKey) await (await getStorage()).delete(v.previewKey).catch(() => {})
  await audit({
    actorId: null, action: 'voice.mix_promoted', targetType: 'voice', targetId: v.id,
    after: { from: 'kokoro', to: main.id, reference: 'system', referenceMs: reference.durationMs, voicedMs, recipe },
  })
  return { voiceId, engine: main.id }
}

/** A lineage member that keeps a system reference synthetic: a Kokoro library voice, or a mix. */
function isSyntheticSource(a: VoiceRow): boolean {
  if (a.kind === 'mixed') return true
  return a.kind === 'library' && a.workspaceId === null && mixRecipeOf(a) !== null
}

registerJobHandler('mix_promote', async (ctx) => {
  const { voiceId } = ctx.job.input as { voiceId: string }
  try {
    return await promoteMix(voiceId)
  } catch (e) {
    // The mix keeps working on the mixer engine; only the upgrade failed.
    await getDb().update(schema.voice).set({ promoteStatus: 'failed' }).where(eq(schema.voice.id, voiceId))
    throw e
  }
})
