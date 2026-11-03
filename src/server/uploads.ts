import 'server-only'
import { and, eq, inArray, lt } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import type { UploadPurpose } from '@/server/db/schema'
import { getStorage } from '@/server/storage'
import { newId } from '@/server/ids'
import { sniffMedia } from '@/server/audio'
import { UserError } from '@/server/api/errors'
import { formatBytes, UPLOAD_LIMITS, UPLOAD_TTL_HOURS } from '@/config/uploads'
import { getMessages, fmt } from '@/i18n'
import type { CreateUploadInput } from '@/lib/schemas/uploads'
import type { Actor } from '@/server/generations'

export type UploadRow = typeof schema.upload.$inferSelect

const ext = (name: string) => name.toLowerCase().match(/\.([a-z0-9]{1,5})$/)?.[1] ?? ''
const typesText = (p: UploadPurpose) => UPLOAD_LIMITS[p].extensions.map((e) => e.toUpperCase()).join(', ')

/** Step 1: checks the declared name, type and size, and returns a signed URL to PUT the file to. */
export async function createUpload(actor: Actor, input: CreateUploadInput) {
  const t = getMessages('en').errors.app
  const limit = UPLOAD_LIMITS[input.purpose]
  const e = ext(input.filename)
  if (!limit.extensions.includes(e)) throw new UserError('file_type', fmt(t.fileType, { types: typesText(input.purpose) }), 422, { file: fmt(t.fileType, { types: typesText(input.purpose) }) })
  if (input.bytes > limit.maxBytes) throw new UserError('file_too_large', fmt(t.fileTooLarge, { limit: formatBytes(limit.maxBytes) }), 413, { file: fmt(t.fileTooLarge, { limit: formatBytes(limit.maxBytes) }) })
  const id = newId('upl')
  const contentType = limit.accept.some((a) => input.contentType.startsWith(a)) ? input.contentType : 'application/octet-stream'
  const storageKey = `${actor.workspaceId}/uploads/${id}.${e}`
  await getDb().insert(schema.upload).values({ id, workspaceId: actor.workspaceId, userId: actor.userId, purpose: input.purpose, storageKey, filename: input.filename, declaredType: contentType, maxBytes: limit.maxBytes })
  const put = await (await getStorage()).signedUploadUrl(storageKey, { contentType })
  return { id, ...put, maxBytes: limit.maxBytes }
}

/** Step 2: after the PUT, checks the real size and sniffs the real type from the bytes. */
export async function completeUpload(workspaceId: string, id: string) {
  const t = getMessages('en').errors.app
  const [u] = await getDb().select().from(schema.upload).where(and(eq(schema.upload.id, id), eq(schema.upload.workspaceId, workspaceId)))
  if (!u) throw new UserError('upload_not_found', t.uploadNotFound, 404)
  if (u.status !== 'pending') return uploadView(u)
  const storage = await getStorage()
  const size = await storage.size(u.storageKey)
  if (!size) throw new UserError('upload_missing', t.uploadMissing, 409)
  if (size > u.maxBytes) {
    await storage.delete(u.storageKey)
    throw new UserError('file_too_large', fmt(t.fileTooLarge, { limit: formatBytes(u.maxBytes) }), 413)
  }
  const bytes = await storage.get(u.storageKey)
  const sniff = bytes ? await sniffMedia(bytes) : null
  if (!sniff || !UPLOAD_LIMITS[u.purpose].accept.some((a) => sniff.mime.startsWith(a))) {
    await storage.delete(u.storageKey)
    await getDb().delete(schema.upload).where(eq(schema.upload.id, id))
    throw new UserError('file_type', fmt(t.fileType, { types: typesText(u.purpose) }), 422, { file: fmt(t.fileType, { types: typesText(u.purpose) }) })
  }
  const [row] = await getDb().update(schema.upload).set({ status: 'ready', bytes: size, mime: sniff.mime }).where(eq(schema.upload.id, id)).returning()
  return uploadView(row!)
}

export function uploadView(u: UploadRow) {
  return { id: u.id, purpose: u.purpose, filename: u.filename, bytes: u.bytes, mime: u.mime, status: u.status, createdAt: u.createdAt }
}

/** Loads ready uploads for one purpose, in the order given, with their bytes. Throws if any is missing. */
export async function takeUploads(workspaceId: string, ids: string[], purpose: UploadPurpose): Promise<Array<UploadRow & { data: Uint8Array }>> {
  const t = getMessages('en').errors.app
  if (!ids.length) return []
  const rows = await getDb().select().from(schema.upload).where(and(eq(schema.upload.workspaceId, workspaceId), inArray(schema.upload.id, ids), eq(schema.upload.purpose, purpose)))
  const storage = await getStorage()
  const out: Array<UploadRow & { data: Uint8Array }> = []
  for (const [i, id] of ids.entries()) {
    const u = rows.find((r) => r.id === id)
    if (!u) throw new UserError('upload_not_found', t.uploadNotFound, 404, { [`uploadIds.${i}`]: t.uploadNotFound })
    if (u.status === 'used') throw new UserError('upload_used', t.uploadUsed, 409, { [`uploadIds.${i}`]: t.uploadUsed })
    if (u.status !== 'ready') throw new UserError('upload_missing', t.uploadMissing, 409, { [`uploadIds.${i}`]: t.uploadMissing })
    const data = await storage.get(u.storageKey)
    if (!data) throw new UserError('upload_missing', t.uploadMissing, 409, { [`uploadIds.${i}`]: t.uploadMissing })
    out.push({ ...u, data })
  }
  return out
}

/** Marks uploads used and deletes their files (the processed copy is stored elsewhere). */
export async function consumeUploads(rows: UploadRow[]) {
  if (!rows.length) return
  const storage = await getStorage()
  for (const r of rows) await storage.delete(r.storageKey)
  await getDb().update(schema.upload).set({ status: 'used' }).where(inArray(schema.upload.id, rows.map((r) => r.id)))
}

/** Housekeeping: removes uploads older than UPLOAD_TTL_HOURS that were never used. */
export async function deleteStaleUploads(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - UPLOAD_TTL_HOURS * 3600_000)
  const stale = await getDb().select().from(schema.upload).where(lt(schema.upload.createdAt, cutoff))
  const storage = await getStorage()
  for (const u of stale) if (u.status !== 'used') await storage.delete(u.storageKey)
  if (stale.length) await getDb().delete(schema.upload).where(inArray(schema.upload.id, stale.map((u) => u.id)))
  return stale.length
}
