import 'server-only'
import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, or } from 'drizzle-orm'
import type { z } from 'zod'
import { getDb, schema } from '@/server/db'
import { newId } from '@/server/ids'
import { audit } from '@/server/audit'
import { env } from '@/server/env'
import { sendEmail } from '@/server/email'
import { getStorage } from '@/server/storage'
import { getBalance } from '@/server/credits'
import { getVoiceEngine } from '@/server/engine'
import { createJob, registerJobHandler } from '@/server/jobs'
import { UserError } from '@/server/api/errors'
import { createZip, type ZipEntry } from '@/server/zip'
import {
  BillingError, cancelAtPeriodEnd, changePlan, createPortalSession, createSubscriptionCheckout, createTopUpCheckout,
} from '@/server/billing'
import { effectivePlan, type BillingPeriod, type PaidPlanId, type TopUp } from '@/config/plans'
import { getMessages, fmt } from '@/i18n'
import { DELETION_GRACE_DAYS, EXPORT_TTL_DAYS, type notificationPrefsSchema } from '@/lib/schemas/account'

const errs = () => getMessages('en').errors.app.account
const DAY = 86_400_000
/** A copy of a row without the named secret fields. */
function omit<T extends object, K extends keyof T>(row: T, ...keys: K[]): Omit<T, K> {
  const out = { ...row }
  for (const k of keys) delete out[k]
  return out
}

/* ------------------------------------------------------------------ billing */

export async function billingView(workspaceId: string) {
  const db = getDb()
  const [w] = await db.select().from(schema.workspace).where(eq(schema.workspace.id, workspaceId))
  if (!w) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  const invoices = await db.select().from(schema.invoice).where(eq(schema.invoice.workspaceId, workspaceId)).orderBy(desc(schema.invoice.createdAt)).limit(24)
  const plan = effectivePlan(w)
  return {
    plan: w.planId, owner: w.unlimited, compUntil: w.compUntil, comped: w.comped, period: w.billingPeriod, status: w.subscriptionStatus, cancelAtPeriodEnd: w.cancelAtPeriodEnd,
    subscribed: !!w.stripeSubscriptionId, hasBillingAccount: !!w.stripeCustomerId,
    cycleStartedAt: w.cycleStartedAt, cycleEndsAt: w.cycleEndsAt, allowance: plan.creditsPerMonth, balance: await getBalance(workspaceId),
    invoices: invoices.map((i) => ({
      id: i.id, number: i.number, amountDue: i.amountDue, amountPaid: i.amountPaid, tax: i.tax, currency: i.currency, status: i.status,
      hostedUrl: i.hostedUrl, pdfUrl: i.pdfUrl, periodStart: i.periodStart, periodEnd: i.periodEnd, createdAt: i.createdAt,
    })),
  }
}

/** Turns billing errors into user-facing ones; Stripe outages become a 503 with friendly copy. */
async function billing<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn() } catch (e) {
    if (e instanceof BillingError) {
      const map = { NO_SUBSCRIPTION: [errs().noSubscription, 409], SAME_PLAN: [errs().samePlan, 409], FREE_PLAN_TOP_UP: [errs().freeTopUp, 409], PLAN_UNAVAILABLE: [errs().billingUnavailable, 503] } as const
      const [msg, status] = map[e.code]
      throw new UserError(e.code.toLowerCase(), msg, status)
    }
    if (e instanceof UserError) throw e
    console.error('[billing]', e)
    throw new UserError('billing_unavailable', errs().billingUnavailable, 503)
  }
}

async function ownerOf(workspaceId: string, userId: string) {
  const [u] = await getDb().select({ email: schema.user.email, name: schema.user.name }).from(schema.user).where(eq(schema.user.id, userId))
  return u!
}

/** New subscribers go to Checkout; existing ones change plan in place. */
export async function startPlanChange(workspaceId: string, userId: string, input: { plan: string; period: string }) {
  const [w] = await getDb().select({ sub: schema.workspace.stripeSubscriptionId }).from(schema.workspace).where(eq(schema.workspace.id, workspaceId))
  const plan = input.plan as PaidPlanId
  const period = input.period as BillingPeriod
  if (w?.sub) {
    await billing(() => changePlan({ workspaceId, plan, period, actorId: userId }))
    return { changed: true as const }
  }
  const url = await billing(async () => createSubscriptionCheckout({ workspaceId, plan, period, owner: await ownerOf(workspaceId, userId) }))
  return { url }
}

export async function startTopUp(workspaceId: string, userId: string, topUp: string) {
  return { url: await billing(async () => createTopUpCheckout({ workspaceId, topUp: topUp as TopUp['id'], owner: await ownerOf(workspaceId, userId) })) }
}

export async function portal(workspaceId: string) {
  const [w] = await getDb().select({ c: schema.workspace.stripeCustomerId }).from(schema.workspace).where(eq(schema.workspace.id, workspaceId))
  if (!w?.c) throw new UserError('no_customer', errs().noCustomer, 409)
  return { url: await billing(() => createPortalSession(workspaceId)) }
}

export async function setCancel(workspaceId: string, userId: string, cancel: boolean) {
  await billing(() => cancelAtPeriodEnd(workspaceId, cancel))
  await audit({ actorId: userId, action: cancel ? 'billing.cancel_scheduled' : 'billing.cancel_undone', targetType: 'workspace', targetId: workspaceId })
}

/** The credit ledger, newest first, 50 at a time. */
export async function ledger(workspaceId: string, before?: Date) {
  const rows = await getDb().select().from(schema.creditLedger)
    .where(and(eq(schema.creditLedger.workspaceId, workspaceId), before ? lt(schema.creditLedger.createdAt, before) : undefined))
    .orderBy(desc(schema.creditLedger.createdAt)).limit(51)
  const items = rows.slice(0, 50).map((r) => ({ id: r.id, delta: r.delta, bucket: r.bucket, reason: r.reason, module: r.module, balanceAfter: r.balanceAfter, createdAt: r.createdAt }))
  return { items, nextBefore: rows.length > 50 ? items[items.length - 1]!.createdAt.toISOString() : null }
}

/* ------------------------------------------------------------------ notifications */

const PREF_DEFAULTS = { jobEmails: true, billingEmails: true, productEmails: false, lowCreditEmails: true }

export async function getPrefs(userId: string) {
  const [p] = await getDb().select().from(schema.notificationPref).where(eq(schema.notificationPref.userId, userId))
  return p ? { jobEmails: p.jobEmails, billingEmails: p.billingEmails, productEmails: p.productEmails, lowCreditEmails: p.lowCreditEmails } : PREF_DEFAULTS
}

export async function setPrefs(userId: string, input: z.infer<typeof notificationPrefsSchema>) {
  const next = { ...(await getPrefs(userId)), ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) }
  await getDb().insert(schema.notificationPref).values({ userId, ...next }).onConflictDoUpdate({ target: schema.notificationPref.userId, set: next })
  return next
}

/* ------------------------------------------------------------------ data export */

const exportKey = (userId: string, id: string) => `exports/${userId}/${id}.zip`
/** Audio included in an export, newest first, up to this total; the rest is listed in generations.json. */
export const EXPORT_AUDIO_BYTES = 1024 * 1024 * 1024

export async function listExports(userId: string) {
  const rows = await getDb().select({ e: schema.dataExport, status: schema.job.status }).from(schema.dataExport)
    .leftJoin(schema.job, eq(schema.job.id, schema.dataExport.jobId))
    .where(eq(schema.dataExport.userId, userId)).orderBy(desc(schema.dataExport.createdAt)).limit(10)
  const now = new Date()
  return rows.map(({ e, status }) => ({
    id: e.id, jobId: e.jobId, createdAt: e.createdAt, expiresAt: e.expiresAt,
    status: e.storageKey ? (e.expiresAt && e.expiresAt <= now ? 'expired' : 'ready') : status === 'failed' || status === 'canceled' ? 'failed' : 'preparing',
  }))
}

/** Starts an export of everything the person has in Mimix. One per 24 hours. */
export async function requestExport(userId: string, workspaceId: string) {
  const db = getDb()
  const recent = await db.select({ e: schema.dataExport, status: schema.job.status }).from(schema.dataExport)
    .leftJoin(schema.job, eq(schema.job.id, schema.dataExport.jobId))
    .where(and(eq(schema.dataExport.userId, userId), gte(schema.dataExport.createdAt, new Date(Date.now() - DAY))))
  if (recent.some((r) => r.status !== 'failed' && r.status !== 'canceled')) throw new UserError('export_recent', errs().exportRecent, 429)
  const id = newId('exp')
  await db.insert(schema.dataExport).values({ id, userId })
  const job = await createJob({ workspaceId, userId, type: 'data_export', input: { exportId: id, title: getMessages('en').app.jobs.types.data_export } })
  await db.update(schema.dataExport).set({ jobId: job.id }).where(eq(schema.dataExport.id, id))
  await audit({ actorId: userId, action: 'account.export_requested', targetType: 'user', targetId: userId })
  return { id, jobId: job.id }
}

export async function exportDownloadUrl(userId: string, id: string) {
  const [e] = await getDb().select().from(schema.dataExport).where(and(eq(schema.dataExport.id, id), eq(schema.dataExport.userId, userId)))
  if (!e) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  if (!e.storageKey) throw new UserError('export_not_ready', errs().exportNotReady, 409)
  if (e.expiresAt && e.expiresAt <= new Date()) throw new UserError('export_expired', errs().exportExpired, 410)
  return (await getStorage()).signedUrl(e.storageKey, { downloadName: `mimix-export-${e.createdAt.toISOString().slice(0, 10)}.zip` })
}

const json = (v: unknown) => new TextEncoder().encode(JSON.stringify(v, null, 2))
const extOf = (mime: string | null, key: string) => key.split('.').pop() ?? (mime?.includes('wav') ? 'wav' : 'mp3')

/**
 * Builds the export: the person's profile and settings, every workspace they own in full (voices,
 * consent records, generations with audio, transcripts, projects, billing records, keys without
 * secrets), and what they made in workspaces they only belong to.
 */
export async function buildExport(userId: string): Promise<Uint8Array> {
  const db = getDb()
  const storage = await getStorage()
  const [u] = await db.select().from(schema.user).where(eq(schema.user.id, userId))
  if (!u) throw new Error('User not found')
  const entries: ZipEntry[] = []
  const add = (name: string, v: unknown) => entries.push({ name, data: json(v) })
  const memberships = await db.select({ ws: schema.workspace, role: schema.workspaceMember.role }).from(schema.workspaceMember)
    .innerJoin(schema.workspace, eq(schema.workspace.id, schema.workspaceMember.workspaceId)).where(eq(schema.workspaceMember.userId, userId))
  add('account.json', {
    id: u.id, name: u.name, email: u.email, emailVerified: u.emailVerified, twoFactorEnabled: u.twoFactorEnabled, locale: u.locale, createdAt: u.createdAt,
    signInMethods: (await db.select({ provider: schema.account.providerId, createdAt: schema.account.createdAt }).from(schema.account).where(eq(schema.account.userId, userId))),
    sessions: await db.select({ createdAt: schema.session.createdAt, expiresAt: schema.session.expiresAt, ipAddress: schema.session.ipAddress, userAgent: schema.session.userAgent }).from(schema.session).where(eq(schema.session.userId, userId)),
    notificationPreferences: await getPrefs(userId),
    workspaces: memberships.map((m) => ({ id: m.ws.id, name: m.ws.name, role: m.role })),
  })
  add('consent-records.json', await db.select().from(schema.consentRecord).where(eq(schema.consentRecord.userId, userId)))
  add('notifications.json', await db.select().from(schema.notification).where(eq(schema.notification.userId, userId)))
  add('reports-filed.json', await db.select().from(schema.abuseReport).where(eq(schema.abuseReport.reporterUserId, userId)))

  let audioBytes = 0
  const owned = memberships.filter((m) => m.role === 'owner').map((m) => m.ws)
  for (const w of owned) {
    const dir = `workspaces/${w.id}`
    add(`${dir}/workspace.json`, { id: w.id, name: w.name, plan: w.planId, billingPeriod: w.billingPeriod, createdAt: w.createdAt })
    const voices = await db.select().from(schema.voice).where(eq(schema.voice.workspaceId, w.id))
    add(`${dir}/voices.json`, voices.map((v) => omit(v, 'engineVoiceId')))
    if (voices.length) add(`${dir}/voice-samples.json`, await db.select().from(schema.voiceSample).where(inArray(schema.voiceSample.voiceId, voices.map((v) => v.id))))
    add(`${dir}/transcripts.json`, await db.select().from(schema.transcript).where(eq(schema.transcript.workspaceId, w.id)))
    add(`${dir}/dubbing-projects.json`, await db.select().from(schema.dubbingProject).where(eq(schema.dubbingProject.workspaceId, w.id)))
    const projects = await db.select().from(schema.studioProject).where(eq(schema.studioProject.workspaceId, w.id))
    const chapters = projects.length ? await db.select().from(schema.studioChapter).where(inArray(schema.studioChapter.projectId, projects.map((p) => p.id))) : []
    const blocks = chapters.length ? await db.select().from(schema.studioBlock).where(inArray(schema.studioBlock.chapterId, chapters.map((c) => c.id))) : []
    add(`${dir}/studio-projects.json`, { projects, chapters, blocks })
    add(`${dir}/pronunciation.json`, await db.select().from(schema.pronunciationRule).where(eq(schema.pronunciationRule.workspaceId, w.id)))
    add(`${dir}/invoices.json`, await db.select().from(schema.invoice).where(eq(schema.invoice.workspaceId, w.id)))
    add(`${dir}/credit-ledger.json`, await db.select().from(schema.creditLedger).where(eq(schema.creditLedger.workspaceId, w.id)))
    add(`${dir}/api-keys.json`, (await db.select().from(schema.apiKey).where(eq(schema.apiKey.workspaceId, w.id))).map((k) => omit(k, 'hash')))
    add(`${dir}/webhooks.json`, (await db.select().from(schema.webhook).where(eq(schema.webhook.workspaceId, w.id))).map((h) => omit(h, 'secretEnc')))
  }
  // Generations: everything in owned workspaces, plus the person's own work elsewhere.
  const ownedIds = owned.map((w) => w.id)
  const gens = await db.select().from(schema.generation)
    .where(or(ownedIds.length ? inArray(schema.generation.workspaceId, ownedIds) : undefined, eq(schema.generation.userId, userId)))
    .orderBy(desc(schema.generation.createdAt))
  const listed = []
  for (const g of gens) {
    let file: string | null = null
    if (g.outputKey && g.status === 'succeeded') {
      const size = (await storage.size(g.outputKey)) ?? 0
      if (size && audioBytes + size <= EXPORT_AUDIO_BYTES) {
        const bytes = await storage.get(g.outputKey)
        if (bytes) { file = `audio/${g.id}.${extOf(g.outputMime, g.outputKey)}`; entries.push({ name: file, data: bytes, date: g.createdAt }); audioBytes += size }
      }
    }
    listed.push({ ...g, file })
  }
  add('generations.json', listed)
  const t = getMessages('en').app.settings.data
  entries.unshift({ name: 'README.txt', data: new TextEncoder().encode(fmt(t.readme, { date: new Date().toISOString(), email: u.email, limit: '1 GB' })) })
  return createZip(entries)
}

registerJobHandler('data_export', async (ctx) => {
  const { exportId } = ctx.job.input as { exportId: string }
  const db = getDb()
  const [e] = await db.select().from(schema.dataExport).where(eq(schema.dataExport.id, exportId))
  if (!e) throw new Error('Export row missing')
  await ctx.progress(10, 'collecting')
  const zip = await buildExport(e.userId)
  await ctx.checkCancelled()
  await ctx.progress(80, 'saving')
  const key = exportKey(e.userId, e.id)
  await (await getStorage()).put(key, zip, 'application/zip')
  const expiresAt = new Date(Date.now() + EXPORT_TTL_DAYS * DAY)
  await db.update(schema.dataExport).set({ storageKey: key, expiresAt }).where(eq(schema.dataExport.id, e.id))
  const [u] = await db.select({ email: schema.user.email, name: schema.user.name }).from(schema.user).where(eq(schema.user.id, e.userId))
  if (u) {
    const m = getMessages('en').emails
    const v = { name: u.name, url: `${env().APP_URL}/app/settings/data` }
    await sendEmail({ to: u.email, subject: m.exportReady.subject, text: `${fmt(m.exportReady.body, v)}\n\n${m.footer}`, tag: 'exportReady' })
  }
  return { exportId: e.id, bytes: zip.byteLength }
})

/** Worker sweep: removes export files past their download window. */
export async function deleteExpiredExports(now = new Date()): Promise<number> {
  const db = getDb()
  const rows = await db.select().from(schema.dataExport).where(and(isNotNull(schema.dataExport.storageKey), lte(schema.dataExport.expiresAt, now)))
  const storage = await getStorage()
  for (const r of rows) {
    await storage.delete(r.storageKey!).catch(() => {})
    await db.update(schema.dataExport).set({ storageKey: null }).where(eq(schema.dataExport.id, r.id))
  }
  return rows.length
}

/* ------------------------------------------------------------------ deletion */

/** Workspaces this person owns that other people also belong to (they block deletion). */
async function sharedOwned(userId: string) {
  const db = getDb()
  const owned = await db.select({ id: schema.workspace.id, name: schema.workspace.name }).from(schema.workspaceMember)
    .innerJoin(schema.workspace, eq(schema.workspace.id, schema.workspaceMember.workspaceId))
    .where(and(eq(schema.workspaceMember.userId, userId), eq(schema.workspaceMember.role, 'owner')))
  const out: typeof owned = []
  for (const w of owned) {
    const others = await db.select({ u: schema.workspaceMember.userId }).from(schema.workspaceMember).where(eq(schema.workspaceMember.workspaceId, w.id))
    if (others.length > 1) out.push(w)
  }
  return { owned, shared: out }
}

export async function deletionStatus(userId: string) {
  const [u] = await getDb().select({ at: schema.user.deletionRequestedAt }).from(schema.user).where(eq(schema.user.id, userId))
  const { shared } = await sharedOwned(userId)
  return { requestedAt: u?.at ?? null, purgeAt: u?.at ? new Date(u.at.getTime() + DELETION_GRACE_DAYS * DAY) : null, blockers: shared }
}

/**
 * Schedules deletion. Subscriptions on the person's own workspaces are set to cancel at the end of
 * the paid period at once, so nothing renews during the grace period.
 */
export async function requestDeletion(user: { id: string; email: string; name: string }, confirmEmail: string) {
  if (confirmEmail.toLowerCase() !== user.email.toLowerCase()) throw new UserError('confirm_email', errs().confirmEmail, 422, { confirmEmail: errs().confirmEmail })
  const { owned, shared } = await sharedOwned(user.id)
  if (shared[0]) throw new UserError('owns_shared', fmt(errs().ownsShared, { workspace: shared[0].name }), 409)
  const db = getDb()
  for (const w of owned) {
    const [row] = await db.select({ sub: schema.workspace.stripeSubscriptionId, c: schema.workspace.cancelAtPeriodEnd }).from(schema.workspace).where(eq(schema.workspace.id, w.id))
    if (row?.sub && !row.c) await billing(() => cancelAtPeriodEnd(w.id, true))
  }
  const now = new Date()
  await db.update(schema.user).set({ deletionRequestedAt: now }).where(eq(schema.user.id, user.id))
  // Keys stop working now; a cancelled deletion means creating new ones.
  if (owned.length) await db.update(schema.apiKey).set({ revokedAt: now }).where(and(inArray(schema.apiKey.workspaceId, owned.map((w) => w.id)), isNull(schema.apiKey.revokedAt)))
  const purgeAt = new Date(now.getTime() + DELETION_GRACE_DAYS * DAY)
  const m = getMessages('en').emails
  const v = { name: user.name, date: purgeAt.toISOString().slice(0, 10), url: `${env().APP_URL}/app/settings/data` }
  await sendEmail({ to: user.email, subject: m.deletionScheduled.subject, text: `${fmt(m.deletionScheduled.body, v)}\n\n${m.footer}`, tag: 'deletionScheduled' })
  await audit({ actorId: user.id, action: 'account.deletion_requested', targetType: 'user', targetId: user.id, after: { purgeAt } })
  return { purgeAt }
}

export async function cancelDeletion(userId: string) {
  const [u] = await getDb().update(schema.user).set({ deletionRequestedAt: null }).where(and(eq(schema.user.id, userId), isNotNull(schema.user.deletionRequestedAt))).returning({ id: schema.user.id })
  if (!u) throw new UserError('not_scheduled', errs().notScheduled, 409)
  await audit({ actorId: userId, action: 'account.deletion_canceled', targetType: 'user', targetId: userId })
}

/**
 * Worker sweep: permanently deletes accounts past the grace period. Stored files go first (voice
 * samples, consent recordings, generated audio, uploads, exports, engine voices), then the
 * person's own workspaces and the user row; database rows cascade. The audit log keeps ids only.
 */
export async function purgeDeletedAccounts(now = new Date()): Promise<number> {
  const db = getDb()
  const due = await db.select({ id: schema.user.id }).from(schema.user)
    .where(and(isNotNull(schema.user.deletionRequestedAt), lte(schema.user.deletionRequestedAt, new Date(now.getTime() - DELETION_GRACE_DAYS * DAY))))
  const storage = await getStorage()
  const engine = getVoiceEngine()
  const drop = async (key: string | null) => { if (key) await storage.delete(key).catch(() => {}) }
  for (const { id: userId } of due) {
    const { owned, shared } = await sharedOwned(userId)
    if (shared.length) continue // someone joined during the grace period; a person has to resolve it
    const ownedIds = owned.map((w) => w.id)
    if (ownedIds.length) {
      const voices = await db.select().from(schema.voice).where(inArray(schema.voice.workspaceId, ownedIds))
      for (const v of voices) {
        await drop(v.previewKey)
        if (v.engineVoiceId) await engine.deleteVoice(v.engineVoiceId).catch(() => {})
      }
      if (voices.length) for (const s of await db.select().from(schema.voiceSample).where(inArray(schema.voiceSample.voiceId, voices.map((v) => v.id)))) await drop(s.storageKey)
      for (const g of await db.select({ k: schema.generation.outputKey }).from(schema.generation).where(inArray(schema.generation.workspaceId, ownedIds))) await drop(g.k)
      for (const u of await db.select({ k: schema.upload.storageKey }).from(schema.upload).where(inArray(schema.upload.workspaceId, ownedIds))) await drop(u.k)
    }
    for (const c of await db.select({ k: schema.consentRecord.audioStorageKey }).from(schema.consentRecord).where(eq(schema.consentRecord.userId, userId))) await drop(c.k)
    for (const e of await db.select({ k: schema.dataExport.storageKey }).from(schema.dataExport).where(eq(schema.dataExport.userId, userId))) await drop(e.k)
    await db.transaction(async (tx) => {
      if (ownedIds.length) await tx.delete(schema.workspace).where(inArray(schema.workspace.id, ownedIds))
      await tx.delete(schema.user).where(eq(schema.user.id, userId))
    })
    await audit({ actorId: null, actorRole: 'system', action: 'account.purged', targetType: 'user', targetId: userId })
  }
  return due.length
}
