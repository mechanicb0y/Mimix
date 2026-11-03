import 'server-only'
import { and, asc, desc, eq, ilike, isNull, ne, notInArray, or, sql, type SQL } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import { getStorage } from '@/server/storage'
import { engineForVoice, engineVoiceIdFor, hiddenLibraryVoiceIds, mixerNeedsRecipes, mixRecipeOf } from '@/server/engine'
import { audit } from '@/server/audit'
import { descendants, ensureLibrarySeeded, isPublic, paramsOf, type VoiceRow } from '@/server/voices'
import { UserError } from '@/server/api/errors'
import { getMessages } from '@/i18n'
import type { VoiceLicence } from '@/server/db/schema'

/** What the browser and API see for a voice. Engine ids and parameters stay on the server. */
export async function voiceView(v: VoiceRow, opts: { workspaceId?: string; saved?: boolean } = {}) {
  return {
    id: v.id, name: v.name, description: v.description, kind: v.kind, status: v.status, licence: v.licence,
    language: v.language, accent: v.accent, gender: v.gender, age: v.age, useCase: v.useCase,
    owned: !!opts.workspaceId && v.workspaceId === opts.workspaceId, library: v.workspaceId === null,
    publishStatus: v.publishStatus, publishNote: v.publishNote, saved: !!opts.saved,
    previewUrl: `/api/v1/voices/${v.id}/preview`, createdAt: v.createdAt,
    // Voice Mixer source? With the Kokoro mixer only voices with a recipe blend (library voices and their mixes).
    mixable: !mixerNeedsRecipes() || mixRecipeOf(v) !== null,
    // "Mix, then clone": pending while the mix is being prepared for the main engine.
    promoteStatus: v.promoteStatus,
  }
}
export type VoiceView = Awaited<ReturnType<typeof voiceView>>

export async function getVoiceRow(id: string) {
  const [v] = await getDb().select().from(schema.voice).where(eq(schema.voice.id, id))
  return v ?? null
}

/** A voice the workspace may see: its own (not deleted), or a public one. */
export async function getVisibleVoice(id: string, workspaceId: string) {
  await ensureLibrarySeeded()
  const v = await getVoiceRow(id)
  if (!v || v.status === 'deleted') return null
  if (v.workspaceId !== workspaceId && !(isPublic(v) && v.status === 'active')) return null
  return v
}

export async function getOwnedVoice(id: string, workspaceId: string) {
  const v = await getVoiceRow(id)
  if (!v || v.workspaceId !== workspaceId || v.status === 'deleted') throw new UserError('voice_not_found', getMessages('en').app.voices.errors.notFound, 404)
  return v
}

/** The workspace's own voices plus the public voices it saved. */
export async function listMyVoices(workspaceId: string) {
  await ensureLibrarySeeded()
  const db = getDb()
  const own = await db.select().from(schema.voice).where(and(eq(schema.voice.workspaceId, workspaceId), ne(schema.voice.status, 'deleted'))).orderBy(desc(schema.voice.createdAt))
  const saved = await db.select({ v: schema.voice }).from(schema.savedVoice).innerJoin(schema.voice, eq(schema.voice.id, schema.savedVoice.voiceId))
    .where(and(eq(schema.savedVoice.workspaceId, workspaceId), eq(schema.voice.status, 'active'))).orderBy(desc(schema.savedVoice.createdAt))
  return {
    own: await Promise.all(own.map((v) => voiceView(v, { workspaceId }))),
    saved: await Promise.all(saved.map((r) => voiceView(r.v, { workspaceId, saved: true }))),
  }
}

export interface LibraryQuery { q?: string; language?: string; gender?: string; age?: string; accent?: string; useCase?: string; licence?: VoiceLicence; sort?: 'name' | 'newest'; page?: number }
export const LIBRARY_PAGE = 24

/** Public voices: Mimix's own plus community voices that passed moderation. */
export async function searchLibrary(workspaceId: string, q: LibraryQuery) {
  await ensureLibrarySeeded()
  const where: SQL[] = [eq(schema.voice.status, 'active'), or(isNull(schema.voice.workspaceId), eq(schema.voice.publishStatus, 'approved'))!]
  if (q.q) where.push(or(ilike(schema.voice.name, `%${q.q}%`), ilike(schema.voice.description, `%${q.q}%`), ilike(schema.voice.accent, `%${q.q}%`))!)
  for (const k of ['language', 'gender', 'age', 'accent', 'useCase'] as const) if (q[k]) where.push(eq(schema.voice[k], q[k]!))
  if (q.licence) where.push(eq(schema.voice.licence, q.licence))
  // Library voices the main engine can't speak (Kokoro has no Arabic, German or Malay voice) stay hidden.
  const hidden = hiddenLibraryVoiceIds()
  if (hidden.length) where.push(notInArray(schema.voice.id, hidden))
  const page = Math.max(1, q.page ?? 1)
  const db = getDb()
  const rows = await db.select().from(schema.voice).where(and(...where))
    .orderBy(q.sort === 'newest' ? desc(schema.voice.createdAt) : asc(schema.voice.name))
    .limit(LIBRARY_PAGE + 1).offset((page - 1) * LIBRARY_PAGE)
  const savedIds = new Set((await db.select({ id: schema.savedVoice.voiceId }).from(schema.savedVoice).where(eq(schema.savedVoice.workspaceId, workspaceId))).map((r) => r.id))
  return {
    items: await Promise.all(rows.slice(0, LIBRARY_PAGE).map((v) => voiceView(v, { workspaceId, saved: savedIds.has(v.id) }))),
    page, hasMore: rows.length > LIBRARY_PAGE,
  }
}

export async function setSaved(workspaceId: string, voiceId: string, saved: boolean) {
  const v = await getVisibleVoice(voiceId, workspaceId)
  if (!v || v.workspaceId === workspaceId) throw new UserError('voice_not_found', getMessages('en').app.voices.errors.notFound, 404)
  if (saved) await getDb().insert(schema.savedVoice).values({ workspaceId, voiceId }).onConflictDoNothing()
  else await getDb().delete(schema.savedVoice).where(and(eq(schema.savedVoice.workspaceId, workspaceId), eq(schema.savedVoice.voiceId, voiceId)))
}

export async function updateVoice(workspaceId: string, id: string, patch: { name?: string; description?: string; licence?: VoiceLicence; language?: string; accent?: string; gender?: string; age?: string; useCase?: string }) {
  const v = await getOwnedVoice(id, workspaceId)
  if (patch.licence && v.kind === 'mixed') {
    // A mix may never be less restrictive than its sources.
    const { mostRestrictive, ancestors, STRICTNESS } = await import('@/server/voices')
    const floor = mostRestrictive((await ancestors(v.id)).map((a) => a.licence))
    if (STRICTNESS[patch.licence] < STRICTNESS[floor]) throw new UserError('licence_too_open', getMessages('en').app.voices.errors.licenceFloor, 422, { licence: getMessages('en').app.voices.errors.licenceFloor })
  }
  const [row] = await getDb().update(schema.voice).set(patch).where(eq(schema.voice.id, id)).returning()
  return row!
}

/**
 * Deletes a voice: engine copy, samples and preview are removed; the row is kept as "deleted" so
 * lineage and consent records still resolve. Mixes made from it stop working (lineage check).
 */
export async function deleteVoice(workspaceId: string, id: string, actorId: string | null) {
  const v = await getOwnedVoice(id, workspaceId)
  const storage = await getStorage()
  const samples = await getDb().select().from(schema.voiceSample).where(eq(schema.voiceSample.voiceId, id))
  for (const s of samples) await storage.delete(s.storageKey)
  if (v.previewKey) await storage.delete(v.previewKey)
  const onEngine = engineForVoice(v)
  const engineId = engineVoiceIdFor(v, onEngine)
  if (engineId) await onEngine.deleteVoice(engineId).catch((e) => console.error('[voice delete] engine', e))
  await getDb().transaction(async (tx) => {
    await tx.delete(schema.voiceSample).where(eq(schema.voiceSample.voiceId, id))
    await tx.update(schema.voice).set({ status: 'deleted', engineVoiceId: null, previewKey: null, publishStatus: 'none', params: {} }).where(eq(schema.voice.id, id))
    await tx.delete(schema.savedVoice).where(eq(schema.savedVoice.voiceId, id))
  })
  const affected = await descendants(id)
  await audit({ actorId, action: 'voice.deleted', targetType: 'voice', targetId: id, after: { affectedMixes: affected.length } })
  return { affectedMixes: affected.length }
}

/** A short preview of the voice, rendered once and cached in storage. Free. */
export async function voicePreview(v: VoiceRow): Promise<{ bytes: Uint8Array; mime: string }> {
  const storage = await getStorage()
  if (v.previewKey) {
    const b = await storage.get(v.previewKey)
    if (b) return { bytes: b, mime: v.previewKey.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav' }
  }
  const engine = engineForVoice(v)
  const text = getMessages('en').app.voices.previewSentence.replace('{name}', v.name)
  const audio = await engine.synthesize({ text, voice: paramsOf(v), engineVoiceId: engineVoiceIdFor(v, engine), seed: `preview-${v.id}` })
  const key = `voices/${v.id}/preview.${audio.mimeType === 'audio/mpeg' ? 'mp3' : 'wav'}`
  await storage.put(key, audio.audio, audio.mimeType)
  await getDb().update(schema.voice).set({ previewKey: key }).where(eq(schema.voice.id, v.id))
  return { bytes: audio.audio, mime: audio.mimeType }
}

/** Distinct filter values present in the public library, for the filter menus. */
export async function libraryFacets() {
  await ensureLibrarySeeded()
  const rows = await getDb().execute<{ language: string; accent: string }>(sql`
    select distinct language, accent from voice where status = 'active' and (workspace_id is null or publish_status = 'approved')`)
  return { languages: [...new Set(rows.map((r) => r.language))].sort(), accents: [...new Set(rows.map((r) => r.accent).filter(Boolean))].sort() }
}


/** The workspace's plan, for limits that depend on it. */
export async function workspacePlan(workspaceId: string) {
  const { effectivePlan } = await import('@/config/plans')
  const [w] = await getDb().select({ planId: schema.workspace.planId, unlimited: schema.workspace.unlimited }).from(schema.workspace).where(eq(schema.workspace.id, workspaceId))
  return effectivePlan(w ?? { planId: 'free' })
}

/** Throws when the workspace has used every custom-voice slot on its plan (clones, designs and mixes). */
export async function assertVoiceSlot(workspaceId: string) {
  const plan = await workspacePlan(workspaceId)
  if (plan.customVoices === null) return
  const [n] = await getDb().select({ n: sql<number>`count(*)::int` }).from(schema.voice)
    .where(and(eq(schema.voice.workspaceId, workspaceId), ne(schema.voice.status, 'deleted')))
  if ((n?.n ?? 0) >= plan.customVoices) {
    throw new UserError('voice_limit', getMessages('en').app.voices.errors.voiceLimit.replace('{limit}', String(plan.customVoices)), 403)
  }
}

/**
 * Asks to list an owned voice in the public library. It stays private to the workspace until a
 * moderator approves it (admin console, Phase 5). Private voices can't be published.
 */
export async function requestPublish(workspaceId: string, id: string, actorId: string | null) {
  const t = getMessages('en').app.voices.errors
  const v = await getOwnedVoice(id, workspaceId)
  if (v.status !== 'active') throw new UserError('publish_not_active', t.publishNotActive, 409)
  if (v.licence === 'private') throw new UserError('publish_private', t.publishPrivate, 422, { licence: t.publishPrivate })
  if (v.description.trim().length < 20) throw new UserError('publish_description', t.publishDescription, 422, { description: t.publishDescription })
  if (!(await workspacePlan(workspaceId)).commercialUse) throw new UserError('publish_plan', t.publishCommercial, 403)
  if (await (await import('@/server/voices')).matchesBlocklist(v.name)) throw new UserError('blocked_name', t.blockedName, 422, { name: t.blockedName })
  const [row] = await getDb().update(schema.voice).set({ publishStatus: 'pending', publishNote: null }).where(eq(schema.voice.id, id)).returning()
  await audit({ actorId, action: 'voice.publish_requested', targetType: 'voice', targetId: id })
  return row!
}

/** Takes a voice out of the library (or withdraws the request). Saved copies elsewhere stop working. */
export async function unpublish(workspaceId: string, id: string, actorId: string | null) {
  await getOwnedVoice(id, workspaceId)
  const [row] = await getDb().update(schema.voice).set({ publishStatus: 'none', publishNote: null }).where(eq(schema.voice.id, id)).returning()
  await getDb().delete(schema.savedVoice).where(eq(schema.savedVoice.voiceId, id))
  await audit({ actorId, action: 'voice.unpublished', targetType: 'voice', targetId: id })
  return row!
}

/** Moderator decision on a publish request. Used by the admin console. */
export async function moderatePublish(id: string, decision: 'approved' | 'rejected', note: string | null, moderatorId: string) {
  const [before] = await getDb().select().from(schema.voice).where(eq(schema.voice.id, id))
  if (!before || before.publishStatus !== 'pending') throw new UserError('not_pending', getMessages('en').errors.app.notFound, 409)
  const [row] = await getDb().update(schema.voice).set({ publishStatus: decision, publishNote: note }).where(eq(schema.voice.id, id)).returning()
  await audit({ actorId: moderatorId, actorRole: 'moderator', action: `voice.publish_${decision}`, targetType: 'voice', targetId: id, before: { publishStatus: before.publishStatus }, after: { publishStatus: decision }, reason: note ?? undefined })
  return row!
}
