import 'server-only'
import { and, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm'
import type { z } from 'zod'
import { getDb, schema } from '@/server/db'
import { newId } from '@/server/ids'
import { audit } from '@/server/audit'
import { env } from '@/server/env'
import { sendEmail } from '@/server/email'
import { getVoiceEngine } from '@/server/engine'
import { descendants } from '@/server/voices'
import { checkProvenance } from '@/server/provenance'
import { UserError } from '@/server/api/errors'
import { getMessages, fmt } from '@/i18n'
import { REPORT_AUTO_DISABLE, type reportSchema } from '@/lib/schemas/safety'

const errs = () => getMessages('en').errors.app.safety

/* ------------------------------------------------------------------ reports */

/**
 * Files a report about a voice or a generation. Anyone can report; the reporter's identity is never
 * shown to the voice owner. Repeated "no consent" reports from different people switch the voice
 * off until a moderator reviews it (section 9: "may disable the voice while we investigate").
 */
export async function fileReport(input: z.infer<typeof reportSchema>, reporter: { userId: string | null; email: string | null }) {
  const db = getDb()
  const exists = input.targetType === 'voice'
    ? (await db.select({ id: schema.voice.id }).from(schema.voice).where(eq(schema.voice.id, input.targetId)))[0]
    : (await db.select({ id: schema.generation.id }).from(schema.generation).where(eq(schema.generation.id, input.targetId)))[0]
  if (!exists) throw new UserError('report_target', errs().unknownTarget, 422, { targetId: errs().unknownTarget })
  const email = input.email || reporter.email || null
  const id = newId('rpt')
  await db.insert(schema.abuseReport).values({
    id, reporterUserId: reporter.userId, reporterEmail: email, targetType: input.targetType, targetId: input.targetId, reason: input.reason, details: input.details,
  })
  await audit({ actorId: reporter.userId, action: 'safety.report_filed', targetType: input.targetType, targetId: input.targetId, after: { reason: input.reason, reportId: id } })

  const m = getMessages('en').emails
  if (email) await sendEmail({ to: email, subject: m.reportReceived.subject, text: `${fmt(m.reportReceived.body, { reference: id })}\n\n${m.footer}`, tag: 'reportReceived' })
  const team = env().SAFETY_EMAIL
  if (team) {
    const v = { reference: id, reason: input.reason, target: `${input.targetType} ${input.targetId}` }
    await sendEmail({ to: team, subject: fmt(m.reportAlert.subject, v), text: fmt(m.reportAlert.body, v), tag: 'reportAlert' })
  }
  if (input.targetType === 'voice' && input.reason === 'no_consent') await maybeAutoDisable(input.targetId)
  return { id }
}

async function maybeAutoDisable(voiceId: string) {
  const db = getDb()
  const [n] = await db.select({ n: sql<number>`count(distinct coalesce(${schema.abuseReport.reporterUserId}, ${schema.abuseReport.reporterEmail}))::int` })
    .from(schema.abuseReport)
    .where(and(eq(schema.abuseReport.targetType, 'voice'), eq(schema.abuseReport.targetId, voiceId), eq(schema.abuseReport.reason, 'no_consent'), eq(schema.abuseReport.status, 'open')))
  if ((n?.n ?? 0) < REPORT_AUTO_DISABLE) return
  const [v] = await db.update(schema.voice).set({ status: 'disabled' }).where(and(eq(schema.voice.id, voiceId), eq(schema.voice.status, 'active'))).returning()
  if (!v) return
  await audit({ actorId: null, actorRole: 'system', action: 'voice.auto_disabled', targetType: 'voice', targetId: voiceId, reason: `${REPORT_AUTO_DISABLE} consent reports` })
  if (v.ownerUserId) {
    const t = getMessages('en').app.safety
    await db.insert(schema.notification).values({ id: newId('ntf'), userId: v.ownerUserId, type: 'voice.disabled', title: fmt(t.disabledTitle, { name: v.name }), body: t.disabledBody, href: `/app/voices/${v.id}` })
  }
}

/* ------------------------------------------------------------------ takedown */

/**
 * Takes a voice down for good (moderators, from the admin console in Phase 5): the voice and every
 * mix built from it stop working, the engine copies are deleted, the speaker fingerprint stays so
 * the same voice can't be cloned again, owners are told in the app and by webhook, and open
 * reports on those voices are closed as actioned.
 */
export async function takeDownVoice(voiceId: string, actor: { id: string | null; role: string }, reason: string) {
  const db = getDb()
  const [root] = await db.select().from(schema.voice).where(eq(schema.voice.id, voiceId))
  if (!root) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  const ids = [voiceId, ...(await descendants(voiceId))]
  const rows = await db.update(schema.voice).set({ status: 'taken_down', takedownReason: reason })
    .where(and(inArray(schema.voice.id, ids), ne(schema.voice.status, 'deleted'))).returning()
  const engine = getVoiceEngine()
  for (const v of rows) if (v.engineVoiceId) await engine.deleteVoice(v.engineVoiceId).catch((e) => console.error('[takedown] engine', e))
  await db.update(schema.abuseReport).set({ status: 'actioned' })
    .where(and(eq(schema.abuseReport.targetType, 'voice'), inArray(schema.abuseReport.targetId, ids), eq(schema.abuseReport.status, 'open')))
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'voice.taken_down', targetType: 'voice', targetId: voiceId, reason, after: { affected: rows.map((r) => r.id) } })

  const t = getMessages('en').app.safety
  const { emitEvent } = await import('@/server/modules/developers')
  for (const v of rows) {
    const viaMix = v.id !== voiceId
    if (v.ownerUserId) {
      await db.insert(schema.notification).values({
        id: newId('ntf'), userId: v.ownerUserId, type: 'voice.taken_down', title: fmt(t.takenDownTitle, { name: v.name }), body: viaMix ? t.takenDownMixBody : t.takenDownBody, href: `/app/voices/${v.id}`,
      })
    }
    if (v.workspaceId) await emitEvent(v.workspaceId, 'voice.taken_down', { voiceId: v.id, name: v.name, sourceVoiceId: viaMix ? voiceId : null })
  }
  return { affected: rows.map((r) => r.id) }
}

/** Voices with an open report, for the moderation queue (Phase 5). */
export async function openReports(limit = 100) {
  return getDb().select().from(schema.abuseReport).where(eq(schema.abuseReport.status, 'open')).orderBy(schema.abuseReport.createdAt).limit(limit)
}

/* ------------------------------------------------------------------ provenance */

/**
 * The public "Was this made with Mimix?" check. Says whether the clip matches a Mimix generation
 * exactly or carries the Mimix label, and gives a reference to report it. It never says who made it.
 */
export async function publicProvenance(bytes: Uint8Array) {
  const r = await checkProvenance(bytes)
  const reference = r.fingerprintMatch?.generationId ?? r.label?.generationId ?? null
  let exists = false
  if (reference) exists = !!(await getDb().select({ id: schema.generation.id }).from(schema.generation).where(and(eq(schema.generation.id, reference), isNotNull(schema.generation.fingerprint))))[0]
  return {
    verdict: r.fingerprintMatch ? 'exact' as const : r.label ? 'labelled' as const : 'none' as const,
    createdAt: r.fingerprintMatch?.createdAt ?? null,
    /** A generation id to put in a report; only when it's a real Mimix generation. */
    reference: exists ? reference : null,
  }
}
