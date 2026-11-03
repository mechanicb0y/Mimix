import 'server-only'
import { and, count, desc, eq, ilike, inArray, max, or, sql, type SQL } from 'drizzle-orm'
import { z } from '@/lib/zod'
import { getDb, schema } from '@/server/db'
import { JOB_STATUSES, MODULES } from '@/server/db/schema'
import { newId } from '@/server/ids'
import { audit } from '@/server/audit'
import { getStorage } from '@/server/storage'
import { UserError } from '@/server/api/errors'
import { takeDownVoice } from '@/server/modules/safety'
import { moderatePublish } from '@/server/modules/voices'
import type { AdminActor } from '@/server/admin/guard'
import { PAGE_SIZE } from '@/server/admin/users'
import { getMessages } from '@/i18n'

const notFound = () => new UserError('not_found', getMessages('en').errors.app.notFound, 404)
const reason = z.string().trim().min(5, 'reason').max(500, 'reason')
const likeOf = (q: string) => `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`

/* ------------------------------------------------------------------ voices */

/** The moderation queue: voices with open reports (most reported first), and publish requests (oldest first). */
export async function voiceQueue() {
  const db = getDb()
  const reported = await db.select({
    voiceId: schema.abuseReport.targetId, reports: count(),
    latest: sql<string>`to_char(max(${schema.abuseReport.createdAt}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
    reasons: sql<string[]>`array_agg(distinct ${schema.abuseReport.reason})`,
  }).from(schema.abuseReport)
    .where(and(eq(schema.abuseReport.targetType, 'voice'), eq(schema.abuseReport.status, 'open')))
    .groupBy(schema.abuseReport.targetId).orderBy(desc(count()), desc(max(schema.abuseReport.createdAt))).limit(100)
  const ids = reported.map((r) => r.voiceId)
  const voices = ids.length ? await db.select().from(schema.voice).where(inArray(schema.voice.id, ids)) : []
  const byId = new Map(voices.map((v) => [v.id, v]))
  const pending = await db.select({ voice: schema.voice, ownerEmail: schema.user.email }).from(schema.voice)
    .leftJoin(schema.user, eq(schema.user.id, schema.voice.ownerUserId))
    .where(eq(schema.voice.publishStatus, 'pending')).orderBy(schema.voice.updatedAt).limit(100)
  return {
    reported: reported.flatMap((r) => { const v = byId.get(r.voiceId); return v ? [{ ...r, voice: v }] : [] }),
    pending,
  }
}

export async function voiceDetail(voiceId: string) {
  const db = getDb()
  const [v] = await db.select().from(schema.voice).where(eq(schema.voice.id, voiceId))
  if (!v) return null
  const [owner, consents, sources, mixes, reports, samples] = await Promise.all([
    v.ownerUserId ? db.select({ id: schema.user.id, name: schema.user.name, email: schema.user.email, status: schema.user.status }).from(schema.user).where(eq(schema.user.id, v.ownerUserId)) : Promise.resolve([]),
    db.select().from(schema.consentRecord).where(eq(schema.consentRecord.voiceId, voiceId)).orderBy(desc(schema.consentRecord.createdAt)),
    db.select({ id: schema.voice.id, name: schema.voice.name, weight: schema.voiceLineage.weight, status: schema.voice.status }).from(schema.voiceLineage)
      .innerJoin(schema.voice, eq(schema.voice.id, schema.voiceLineage.sourceVoiceId)).where(eq(schema.voiceLineage.mixVoiceId, voiceId)),
    db.select({ id: schema.voice.id, name: schema.voice.name, status: schema.voice.status }).from(schema.voiceLineage)
      .innerJoin(schema.voice, eq(schema.voice.id, schema.voiceLineage.mixVoiceId)).where(eq(schema.voiceLineage.sourceVoiceId, voiceId)),
    db.select().from(schema.abuseReport).where(and(eq(schema.abuseReport.targetType, 'voice'), eq(schema.abuseReport.targetId, voiceId))).orderBy(desc(schema.abuseReport.createdAt)),
    db.select({ n: count() }).from(schema.voiceSample).where(eq(schema.voiceSample.voiceId, voiceId)),
  ])
  const preview = v.previewKey ? await (await getStorage()).signedUrl(v.previewKey) : null
  return { voice: v, owner: owner[0] ?? null, consents, sources, mixes, reports, samples: samples[0]?.n ?? 0, preview }
}

export const takedownSchema = z.object({ reason })
export async function adminTakedown(actor: AdminActor, voiceId: string, input: z.infer<typeof takedownSchema>) {
  return takeDownVoice(voiceId, { id: actor.id, role: actor.role }, input.reason)
}

export const dismissSchema = z.object({ reason })
/**
 * Closes a voice's open reports without action. A voice that was switched off automatically by
 * repeated consent reports comes back on.
 */
export async function dismissVoiceReports(actor: AdminActor, voiceId: string, input: z.infer<typeof dismissSchema>) {
  const db = getDb()
  const [v] = await db.select().from(schema.voice).where(eq(schema.voice.id, voiceId))
  if (!v) throw notFound()
  const closed = await db.update(schema.abuseReport).set({ status: 'dismissed' })
    .where(and(eq(schema.abuseReport.targetType, 'voice'), eq(schema.abuseReport.targetId, voiceId), eq(schema.abuseReport.status, 'open'))).returning({ id: schema.abuseReport.id })
  if (v.status === 'disabled') await db.update(schema.voice).set({ status: 'active' }).where(eq(schema.voice.id, voiceId))
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'voice.reports_dismissed', targetType: 'voice', targetId: voiceId, before: { status: v.status }, after: { status: v.status === 'disabled' ? 'active' : v.status, closed: closed.length }, reason: input.reason, ipAddress: actor.ip })
  return { closed: closed.length }
}

export const publishDecisionSchema = z.object({ decision: z.enum(['approved', 'rejected']), note: z.string().trim().max(500).optional().default('') })
export async function decidePublish(actor: AdminActor, voiceId: string, input: z.infer<typeof publishDecisionSchema>) {
  if (input.decision === 'rejected' && input.note.length < 5) throw new UserError('validation', getMessages('en').errors.admin.reasonRequired, 422, { note: getMessages('en').errors.admin.reasonRequired })
  return moderatePublish(voiceId, input.decision, input.note || null, actor.id)
}

/* ------------------------------------------------------------------ consent records */

export async function consentSearch(q: string, page = 1) {
  const db = getDb()
  const where: SQL | undefined = q
    ? or(eq(schema.consentRecord.voiceId, q), eq(schema.consentRecord.id, q), ilike(schema.user.email, likeOf(q)))
    : undefined
  const rows = await db.select({ record: schema.consentRecord, email: schema.user.email, voiceName: schema.voice.name })
    .from(schema.consentRecord).innerJoin(schema.user, eq(schema.user.id, schema.consentRecord.userId))
    .leftJoin(schema.voice, eq(schema.voice.id, schema.consentRecord.voiceId))
    .where(where).orderBy(desc(schema.consentRecord.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE)
  return rows
}

/* ------------------------------------------------------------------ public-figure blocklist */

export const blockSchema = z.object({
  name: z.string().trim().min(2, 'name').max(120, 'name'),
  aliases: z.array(z.string().trim().min(2).max(120)).max(20).default([]),
  reason: z.enum(['public_figure', 'taken_down', 'other']).default('public_figure'),
})

export async function listBlocklist() {
  return getDb().select().from(schema.blockedVoice).orderBy(schema.blockedVoice.name)
}

export async function addBlocked(actor: AdminActor, input: z.infer<typeof blockSchema>) {
  const id = newId('blk')
  await getDb().insert(schema.blockedVoice).values({ id, name: input.name, aliases: input.aliases, reason: input.reason })
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'blocklist.added', targetType: 'blocked_voice', targetId: id, after: input, ipAddress: actor.ip })
  return { id }
}

export async function removeBlocked(actor: AdminActor, id: string) {
  const [row] = await getDb().delete(schema.blockedVoice).where(eq(schema.blockedVoice.id, id)).returning()
  if (!row) throw notFound()
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'blocklist.removed', targetType: 'blocked_voice', targetId: id, before: { name: row.name, aliases: row.aliases }, ipAddress: actor.ip })
}

/* ------------------------------------------------------------------ generations */

export const generationSearchSchema = z.object({
  q: z.string().trim().max(200).optional().default(''),
  module: z.enum(MODULES).optional().catch(undefined),
  status: z.enum(JOB_STATUSES).optional().catch(undefined),
  flagged: z.enum(['1']).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).optional().catch(1).default(1),
})

export async function searchGenerations(input: z.input<typeof generationSearchSchema>) {
  const f = generationSearchSchema.parse(input)
  const where: SQL[] = []
  if (f.q) where.push(or(eq(schema.generation.id, f.q), eq(schema.generation.workspaceId, f.q), eq(schema.generation.userId, f.q), eq(schema.generation.voiceId, f.q), ilike(schema.user.email, likeOf(f.q)), sql`${schema.generation.input}->>'text' ilike ${likeOf(f.q)}`)!)
  if (f.module) where.push(eq(schema.generation.module, f.module))
  if (f.status) where.push(eq(schema.generation.status, f.status))
  if (f.flagged) where.push(eq(schema.generation.flagged, true))
  const cond = where.length ? and(...where) : undefined
  const rows = await getDb().select({
    id: schema.generation.id, module: schema.generation.module, status: schema.generation.status, credits: schema.generation.credits, units: schema.generation.units,
    flagged: schema.generation.flagged, createdAt: schema.generation.createdAt, workspaceId: schema.generation.workspaceId, email: schema.user.email,
    text: sql<string | null>`left(${schema.generation.input}->>'text', 140)`, error: schema.generation.error, apiKeyId: schema.generation.apiKeyId,
  }).from(schema.generation).leftJoin(schema.user, eq(schema.user.id, schema.generation.userId))
    .where(cond).orderBy(desc(schema.generation.createdAt)).limit(PAGE_SIZE).offset((f.page - 1) * PAGE_SIZE)
  return { rows, page: f.page, filters: f }
}

export async function generationDetail(id: string) {
  const db = getDb()
  const [g] = await db.select().from(schema.generation).where(eq(schema.generation.id, id))
  if (!g) return null
  const [user, voice, reports] = await Promise.all([
    g.userId ? db.select({ id: schema.user.id, email: schema.user.email, name: schema.user.name }).from(schema.user).where(eq(schema.user.id, g.userId)) : Promise.resolve([]),
    g.voiceId ? db.select({ id: schema.voice.id, name: schema.voice.name, status: schema.voice.status }).from(schema.voice).where(eq(schema.voice.id, g.voiceId)) : Promise.resolve([]),
    db.select().from(schema.abuseReport).where(and(eq(schema.abuseReport.targetType, 'generation'), eq(schema.abuseReport.targetId, id))).orderBy(desc(schema.abuseReport.createdAt)),
  ])
  const audio = g.outputKey ? await (await getStorage()).signedUrl(g.outputKey) : null
  return { generation: g, user: user[0] ?? null, voice: voice[0] ?? null, reports, audio }
}

export const flagSchema = z.object({ flagged: z.boolean(), reason })
export async function setGenerationFlag(actor: AdminActor, id: string, input: z.infer<typeof flagSchema>) {
  const [before] = await getDb().select({ flagged: schema.generation.flagged }).from(schema.generation).where(eq(schema.generation.id, id))
  if (!before) throw notFound()
  await getDb().update(schema.generation).set({ flagged: input.flagged }).where(eq(schema.generation.id, id))
  await audit({ actorId: actor.id, actorRole: actor.role, action: input.flagged ? 'generation.flagged' : 'generation.unflagged', targetType: 'generation', targetId: id, before, after: { flagged: input.flagged }, reason: input.reason, ipAddress: actor.ip })
}

/* ------------------------------------------------------------------ abuse reports */

export async function openReportList(type?: 'voice' | 'generation' | 'user') {
  return getDb().select().from(schema.abuseReport)
    .where(and(eq(schema.abuseReport.status, 'open'), type ? eq(schema.abuseReport.targetType, type) : undefined))
    .orderBy(desc(schema.abuseReport.createdAt)).limit(200)
}

export const reportDecisionSchema = z.object({ status: z.enum(['actioned', 'dismissed']), reason })
export async function decideReport(actor: AdminActor, reportId: string, input: z.infer<typeof reportDecisionSchema>) {
  const [r] = await getDb().update(schema.abuseReport).set({ status: input.status })
    .where(and(eq(schema.abuseReport.id, reportId), eq(schema.abuseReport.status, 'open'))).returning()
  if (!r) throw notFound()
  await audit({ actorId: actor.id, actorRole: actor.role, action: `report.${input.status}`, targetType: r.targetType, targetId: r.targetId, after: { reportId }, reason: input.reason, ipAddress: actor.ip })
}
