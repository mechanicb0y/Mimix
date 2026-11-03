import 'server-only'
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import type { VoiceLicence } from '@/server/db/schema'
import { LIBRARY_VOICES } from '@/config/voices'
import { MIXER_VOICES, mixerVoiceId } from '@/config/mixer-voices'
import { voiceRecipe } from '@/lib/voice/kokoro-engine'
import { hiddenLibraryVoiceIds, mixerNeedsRecipes } from '@/server/engine'
import { UserError } from '@/server/api/errors'
import { getMessages } from '@/i18n'
import type { VoiceParams } from '@/lib/voice/types'

export type VoiceRow = typeof schema.voice.$inferSelect

/** Library voices are seeded from config once per process (idempotent). */
let seeded: Promise<void> | undefined
export function ensureLibrarySeeded(): Promise<void> {
  seeded ??= (async () => {
    const rows = LIBRARY_VOICES.map((v) => ({
      id: `lib_${v.id}`, workspaceId: null, name: v.name, kind: 'library' as const, status: 'active' as const, licence: v.licence,
      params: v.params as unknown as Record<string, number>, language: v.language, accent: v.accent, gender: v.gender, age: v.age, useCase: v.useCase,
      publishStatus: 'approved' as const, description: '',
    }))
    await getDb().insert(schema.voice).values(rows).onConflictDoNothing()
  })().catch((e) => { seeded = undefined; throw e })
  return mixerNeedsRecipes() ? seeded.then(ensureMixerVoicesSeeded) : seeded
}

let mixerSeeded: Promise<void> | undefined
/**
 * Voice Mixer v1 sources (MIXER_ENGINE=kokoro): Kokoro's English voices as library voices with a
 * remix licence. Their recipe is both the engine voice id (they speak on the mixer engine) and the
 * mix recipe (what the Mixer blends).
 */
function ensureMixerVoicesSeeded(): Promise<void> {
  mixerSeeded ??= (async () => {
    const rows = MIXER_VOICES.map((v) => {
      const recipe = voiceRecipe(v.kokoro)
      return {
        id: mixerVoiceId(v), workspaceId: null, name: v.name, kind: 'library' as const, status: 'active' as const, licence: 'remix' as const,
        params: v.params as unknown as Record<string, number>, language: v.language ?? 'en', accent: v.accent, gender: v.gender, age: v.age, useCase: v.useCase,
        publishStatus: 'approved' as const, description: '', engine: 'kokoro', engineVoiceId: recipe, mixRecipe: recipe,
      }
    })
    await getDb().insert(schema.voice).values(rows).onConflictDoNothing()
  })().catch((e) => { mixerSeeded = undefined; throw e })
  return mixerSeeded
}

/** Most restrictive first wins: private > standard > remix. */
const STRICTNESS: Record<VoiceLicence, number> = { remix: 0, standard: 1, private: 2 }
export function mostRestrictive(licences: VoiceLicence[]): VoiceLicence {
  return licences.reduce<VoiceLicence>((a, b) => (STRICTNESS[b] > STRICTNESS[a] ? b : a), 'remix')
}

export function isPublic(v: VoiceRow): boolean {
  return v.workspaceId === null || v.publishStatus === 'approved'
}

/** May this workspace generate speech with this voice? */
export function canUse(v: VoiceRow, workspaceId: string): boolean {
  if (v.status !== 'active') return false
  return v.workspaceId === workspaceId || isPublic(v)
}

/** May this workspace use the voice as a Voice Mixer source? Owned, or public with a remix licence. */
export function canMix(v: VoiceRow, workspaceId: string): boolean {
  if (v.status !== 'active') return false
  if (v.workspaceId === workspaceId) return true
  return isPublic(v) && v.licence === 'remix'
}

/** Every ancestor of a mixed voice (recursive lineage). */
export async function ancestors(voiceId: string): Promise<VoiceRow[]> {
  const rows = await getDb().execute<{ id: string }>(sql`
    with recursive up(id) as (
      select source_voice_id from voice_lineage where mix_voice_id = ${voiceId}
      union
      select l.source_voice_id from voice_lineage l join up on l.mix_voice_id = up.id
    ) select id from up`)
  const ids = rows.map((r) => r.id)
  if (!ids.length) return []
  return getDb().select().from(schema.voice).where(inArray(schema.voice.id, ids))
}

/** Every mix built (directly or not) from this voice, for takedowns and deletion. */
export async function descendants(voiceId: string): Promise<string[]> {
  const rows = await getDb().execute<{ id: string }>(sql`
    with recursive down(id) as (
      select mix_voice_id from voice_lineage where source_voice_id = ${voiceId}
      union
      select l.mix_voice_id from voice_lineage l join down on l.source_voice_id = down.id
    ) select id from down`)
  return rows.map((r) => r.id)
}

/**
 * Loads a voice for generation and checks access, consent and lineage: a mix stops working when
 * any source voice is disabled, taken down or deleted.
 */
export async function resolveVoiceForUse(voiceId: string, workspaceId: string): Promise<VoiceRow> {
  await ensureLibrarySeeded()
  const t = getMessages('en').app.voices.errors
  const [v] = await getDb().select().from(schema.voice).where(eq(schema.voice.id, voiceId))
  if (!v || v.status === 'deleted' || (v.workspaceId !== workspaceId && !isPublic(v))) throw new UserError('voice_not_found', t.notFound, 404)
  if (v.status === 'pending_consent') throw new UserError('consent_required', getMessages('en').errors.app.consentRequired, 409)
  if (v.status === 'taken_down') throw new UserError('voice_taken_down', t.takenDown, 410)
  if (!canUse(v, workspaceId)) throw new UserError('voice_unavailable', t.unavailable, 409)
  // A library voice the main engine has no voice for (Kokoro: Arabic, German, Malay). Refused before any charge.
  if (hiddenLibraryVoiceIds().includes(v.id)) throw new UserError('voice_unavailable', getMessages('en').errors.app.engine.voiceUnavailable, 422)
  if (v.kind === 'mixed') {
    const up = await ancestors(v.id)
    if (up.some((a) => a.status !== 'active')) throw new UserError('voice_source_removed', t.sourceRemoved, 410)
  }
  return v
}

export function paramsOf(v: VoiceRow): VoiceParams {
  return v.params as unknown as VoiceParams
}

/** Voices this workspace can pick: its own plus saved library/community voices plus Mimix defaults. */
export async function listUsableVoices(workspaceId: string) {
  await ensureLibrarySeeded()
  const saved = getDb().select({ id: schema.savedVoice.voiceId }).from(schema.savedVoice).where(eq(schema.savedVoice.workspaceId, workspaceId))
  return getDb().select().from(schema.voice).where(and(
    eq(schema.voice.status, 'active'),
    or(eq(schema.voice.workspaceId, workspaceId), isNull(schema.voice.workspaceId), inArray(schema.voice.id, saved)),
  )).orderBy(schema.voice.name)
}

/** Case-insensitive check of a name against the public-figure blocklist (names and aliases). */
export async function matchesBlocklist(name: string): Promise<boolean> {
  const n = name.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!n) return false
  const rows = await getDb().execute<{ id: string }>(sql`
    select id from blocked_voice
    where lower(name) = ${n} or exists (select 1 from unnest(aliases) a where lower(a) = ${n})
       or position(lower(name) in ${n}) > 0
    limit 1`)
  return rows.length > 0
}

export { STRICTNESS }
