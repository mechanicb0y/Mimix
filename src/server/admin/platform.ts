import 'server-only'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { and, count, desc, eq, gte, ilike, inArray, isNull, like, lte, ne, or, sql, type SQL } from 'drizzle-orm'
import { z } from '@/lib/zod'
import type Stripe from 'stripe'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { getDb, schema } from '@/server/db'
import { PLAN_IDS } from '@/server/db/schema'
import { env } from '@/server/env'
import { audit } from '@/server/audit'
import { UserError } from '@/server/api/errors'
import { getStripe } from '@/server/billing'
import { refreshPlans } from '@/server/plans'
import { forgetFlags, flagRules } from '@/server/flags'
import { setSetting } from '@/server/settings'
import { capabilitiesFor } from '@/server/engine'
import { speakerVerifier } from '@/server/speaker-verifier'
import { sendEmail } from '@/server/email'
import { PLANS, getPlan, priceLookupKey, type PaidPlanId, type Plan, PAID_PLAN_IDS } from '@/config/plans'
import { FLAG_KEYS, type FlagKey } from '@/config/flags'
import type { AdminActor } from '@/server/admin/guard'
import { PAGE_SIZE } from '@/server/admin/users'
import { fmt, getMessages } from '@/i18n'

const errs = () => getMessages('en').errors.admin
const reason = z.string().trim().min(5, 'reason').max(500, 'reason')

/* ------------------------------------------------------------------ plans and pricing */

const cents = z.number().int().min(0).max(10_000_000)
const limit = z.number().int().min(0).max(1_000_000_000)

export const planEditSchema = z.object({
  monthly: cents.nullable(),
  annualPerMonth: cents.nullable(),
  creditsPerMonth: limit.nullable(),
  seats: z.number().int().min(1).max(10_000).nullable(),
  customVoices: z.number().int().min(0).max(100_000).nullable(),
  professionalClones: z.number().int().min(0).max(1_000),
  mixerSources: z.union([z.literal(2), z.literal(3)]),
  reason,
}).refine((v) => v.monthly === null || v.annualPerMonth === null || v.annualPerMonth <= v.monthly, { path: ['annualPerMonth'], message: 'annualPerMonth' })

/** The plans as they stand, with the defaults beside them so the console can show what changed. */
export async function planTable() {
  await refreshPlans(true)
  return PLANS.map((d) => ({ defaults: d, current: getPlan(d.id) }))
}

/**
 * Creates a new Stripe price for a plan and moves its lookup key to it. Existing subscribers keep
 * the price they signed up at (Stripe never reprices a subscription on its own); new checkouts use
 * the new one.
 */
async function syncStripePrice(plan: PaidPlanId, period: 'monthly' | 'annual', amount: number) {
  const stripe = getStripe()
  const lookup_key = priceLookupKey(plan, period)
  const existing = (await stripe.prices.list({ lookup_keys: [lookup_key], active: true, limit: 1 })).data[0]
  if (existing && existing.unit_amount === amount) return existing.id
  const product = existing ? (typeof existing.product === 'string' ? existing.product : existing.product.id) : `mimix_${plan}`
  const price = await stripe.prices.create({
    product, currency: 'usd', unit_amount: amount, recurring: { interval: period === 'monthly' ? 'month' : 'year' },
    lookup_key, transfer_lookup_key: true, tax_behavior: 'exclusive', metadata: { plan, period },
  })
  return price.id
}

export async function editPlan(actor: AdminActor, planId: Plan['id'], input: z.infer<typeof planEditSchema>) {
  const before = getPlan(planId)
  const paid = (PAID_PLAN_IDS as string[]).includes(planId)
  const prices = planId === 'enterprise' || input.monthly === null || input.annualPerMonth === null
    ? null : { USD: { monthly: input.monthly, annualPerMonth: input.annualPerMonth } }
  if (planId === 'free' && prices && (prices.USD.monthly !== 0 || prices.USD.annualPerMonth !== 0)) throw new UserError('validation', getMessages('en').errors.app.validation, 422, { monthly: 'free' })
  const synced: string[] = []
  if (paid && prices) {
    const old = before.prices.USD
    try {
      if (old?.monthly !== prices.USD.monthly) synced.push(await syncStripePrice(planId as PaidPlanId, 'monthly', prices.USD.monthly))
      if (old?.annualPerMonth !== prices.USD.annualPerMonth) synced.push(await syncStripePrice(planId as PaidPlanId, 'annual', prices.USD.annualPerMonth * 12))
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      throw new UserError('stripe_failed', fmt(errs().stripeFailed, { message }), 502)
    }
  }
  const row = {
    planId, prices, creditsPerMonth: input.creditsPerMonth, seats: input.seats, customVoices: input.customVoices,
    professionalClones: input.professionalClones, mixerSources: input.mixerSources, updatedBy: actor.id,
  }
  await getDb().insert(schema.planSetting).values(row).onConflictDoUpdate({ target: schema.planSetting.planId, set: { ...row, updatedAt: new Date() } })
  await refreshPlans(true)
  const after = getPlan(planId)
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'plan.edited', targetType: 'plan', targetId: planId, before: pickPlan(before), after: { ...pickPlan(after), stripePrices: synced }, reason: input.reason, ipAddress: actor.ip })
  return { plan: after, stripePrices: synced }
}

function pickPlan(p: Plan) {
  return { prices: p.prices, creditsPerMonth: p.creditsPerMonth, seats: p.seats, customVoices: p.customVoices, professionalClones: p.professionalClones, mixerSources: p.mixerSources }
}

/** Back to the defaults in src/config/plans.ts (Stripe prices are left as they are; edit again to change them). */
export async function resetPlan(actor: AdminActor, planId: Plan['id'], why: string) {
  const before = getPlan(planId)
  await getDb().delete(schema.planSetting).where(eq(schema.planSetting.planId, planId))
  await refreshPlans(true)
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'plan.reset', targetType: 'plan', targetId: planId, before: pickPlan(before), after: pickPlan(getPlan(planId)), reason: why, ipAddress: actor.ip })
}

/* ------------------------------------------------------------------ coupons (Stripe promotion codes) */

export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, 'code'),
  percentOff: z.number().int().min(1).max(100).nullable(),
  amountOff: z.number().int().min(1).max(1_000_000).nullable(),
  duration: z.enum(['once', 'repeating', 'forever']),
  durationInMonths: z.number().int().min(1).max(36).nullable(),
  maxRedemptions: z.number().int().min(1).max(1_000_000).nullable(),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expiresAt').nullable(),
}).refine((v) => (v.percentOff === null) !== (v.amountOff === null), { path: ['percentOff'], message: 'discount' })
  .refine((v) => v.duration !== 'repeating' || v.durationInMonths !== null, { path: ['durationInMonths'], message: 'durationInMonths' })

export interface CouponView { id: string; code: string; active: boolean; percentOff: number | null; amountOff: number | null; duration: string; durationInMonths: number | null; timesRedeemed: number; maxRedemptions: number | null; expiresAt: string | null }

function couponOf(p: Stripe.PromotionCode): Stripe.Coupon | null {
  const c = p.promotion?.coupon
  return c && typeof c === 'object' ? c : null
}

export async function listCoupons(): Promise<CouponView[]> {
  const res = await getStripe().promotionCodes.list({ limit: 100, expand: ['data.promotion.coupon'] })
  return res.data.map((p) => {
    const c = couponOf(p)
    return {
      id: p.id, code: p.code, active: p.active, percentOff: c?.percent_off ?? null, amountOff: c?.amount_off ?? null, duration: c?.duration ?? 'once',
      durationInMonths: c?.duration_in_months ?? null, timesRedeemed: p.times_redeemed, maxRedemptions: p.max_redemptions ?? null,
      expiresAt: p.expires_at ? new Date(p.expires_at * 1000).toISOString().slice(0, 10) : null,
    }
  })
}

export async function createCoupon(actor: AdminActor, input: z.infer<typeof couponSchema>) {
  const stripe = getStripe()
  try {
    const coupon = await stripe.coupons.create({
      ...(input.percentOff !== null ? { percent_off: input.percentOff } : { amount_off: input.amountOff!, currency: 'usd' }),
      duration: input.duration, ...(input.duration === 'repeating' ? { duration_in_months: input.durationInMonths! } : {}),
      name: input.code, metadata: { createdBy: actor.id },
    })
    const expires = input.expiresAt ? Math.floor(new Date(`${input.expiresAt}T23:59:59Z`).getTime() / 1000) : undefined
    const promo = await stripe.promotionCodes.create({
      code: input.code, ...(input.maxRedemptions ? { max_redemptions: input.maxRedemptions } : {}), ...(expires ? { expires_at: expires } : {}),
      promotion: { type: 'coupon', coupon: coupon.id },
    })
    await audit({ actorId: actor.id, actorRole: actor.role, action: 'coupon.created', targetType: 'coupon', targetId: promo.id, after: input, ipAddress: actor.ip })
    return { id: promo.id }
  } catch (e) {
    if (e instanceof UserError) throw e
    throw new UserError('stripe_failed', fmt(errs().stripeFailed, { message: e instanceof Error ? e.message : String(e) }), 502)
  }
}

export async function deactivateCoupon(actor: AdminActor, promoId: string) {
  try {
    await getStripe().promotionCodes.update(promoId, { active: false })
  } catch (e) {
    throw new UserError('stripe_failed', fmt(errs().stripeFailed, { message: e instanceof Error ? e.message : String(e) }), 502)
  }
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'coupon.deactivated', targetType: 'coupon', targetId: promoId, after: { active: false }, ipAddress: actor.ip })
}

/* ------------------------------------------------------------------ feature flags, banner, maintenance */

export const flagEditSchema = z.object({
  enabled: z.boolean(),
  plans: z.array(z.enum(PLAN_IDS)).max(PLAN_IDS.length).default([]),
  userIds: z.array(z.string().trim().min(1).max(64)).max(500).default([]),
})

export async function editFlag(actor: AdminActor, key: FlagKey, input: z.infer<typeof flagEditSchema>) {
  if (!FLAG_KEYS.includes(key)) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  const before = (await flagRules())[key]
  const userIds = [...new Set(input.userIds)]
  if (userIds.length) {
    const found = await getDb().select({ id: schema.user.id }).from(schema.user).where(inArray(schema.user.id, userIds))
    const missing = userIds.filter((u) => !found.some((f) => f.id === u))
    if (missing.length) throw new UserError('validation', getMessages('en').errors.app.validation, 422, { userIds: missing.join(', ') })
  }
  const row = { key, enabled: input.enabled, plans: [...new Set(input.plans)], userIds, updatedBy: actor.id }
  await getDb().insert(schema.featureFlag).values(row).onConflictDoUpdate({ target: schema.featureFlag.key, set: { ...row, updatedAt: new Date() } })
  forgetFlags()
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'flag.edited', targetType: 'flag', targetId: key, before, after: { enabled: row.enabled, plans: row.plans, userIds: row.userIds }, ipAddress: actor.ip })
}

export const announcementSchema = z.object({
  active: z.boolean(),
  message: z.string().trim().max(200, 'message'),
  tone: z.enum(['info', 'warning']),
  href: z.string().trim().max(300).refine((v) => v === '' || v.startsWith('/') || v.startsWith('https://'), 'href').default(''),
}).refine((v) => !v.active || v.message.length >= 5, { path: ['message'], message: 'message' })

export async function saveAnnouncement(actor: AdminActor, input: z.infer<typeof announcementSchema>) {
  await setSetting('announcement', input, actor.id)
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'site.announcement_saved', targetType: 'setting', targetId: 'announcement', after: input, ipAddress: actor.ip })
}

export const maintenanceSchema = z.object({ active: z.boolean(), message: z.string().trim().max(300, 'message'), reason })

export async function saveMaintenance(actor: AdminActor, input: z.infer<typeof maintenanceSchema>) {
  await setSetting('maintenance', { active: input.active, message: input.message }, actor.id)
  await audit({ actorId: actor.id, actorRole: actor.role, action: input.active ? 'site.maintenance_on' : 'site.maintenance_off', targetType: 'setting', targetId: 'maintenance', after: { active: input.active, message: input.message }, reason: input.reason, ipAddress: actor.ip })
}

/* ------------------------------------------------------------------ developers */

export async function searchApiKeys(q: string, page = 1, onlyActive = false) {
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`
  const where: SQL[] = []
  if (q) where.push(or(eq(schema.apiKey.id, q), eq(schema.apiKey.workspaceId, q), ilike(schema.apiKey.prefix, like), ilike(schema.apiKey.name, like), ilike(schema.user.email, like))!)
  if (onlyActive) where.push(isNull(schema.apiKey.revokedAt))
  return getDb().select({
    id: schema.apiKey.id, name: schema.apiKey.name, prefix: schema.apiKey.prefix, scopes: schema.apiKey.scopes, rateLimitPerMinute: schema.apiKey.rateLimitPerMinute,
    creditLimit: schema.apiKey.creditLimit, lastUsedAt: schema.apiKey.lastUsedAt, revokedAt: schema.apiKey.revokedAt, createdAt: schema.apiKey.createdAt,
    workspaceId: schema.apiKey.workspaceId, workspaceName: schema.workspace.name, email: schema.user.email,
  }).from(schema.apiKey).innerJoin(schema.workspace, eq(schema.workspace.id, schema.apiKey.workspaceId))
    .leftJoin(schema.user, eq(schema.user.id, schema.apiKey.createdBy))
    .where(where.length ? and(...where) : undefined).orderBy(desc(schema.apiKey.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE)
}

export const keyEditSchema = z.object({ rateLimitPerMinute: z.number().int().min(1).max(100_000), reason })

export async function setKeyRateLimit(actor: AdminActor, keyId: string, input: z.infer<typeof keyEditSchema>) {
  const [k] = await getDb().select().from(schema.apiKey).where(eq(schema.apiKey.id, keyId))
  if (!k) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  await getDb().update(schema.apiKey).set({ rateLimitPerMinute: input.rateLimitPerMinute }).where(eq(schema.apiKey.id, keyId))
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'api_key.rate_limit_changed', targetType: 'api_key', targetId: keyId, before: { rateLimitPerMinute: k.rateLimitPerMinute }, after: { rateLimitPerMinute: input.rateLimitPerMinute }, reason: input.reason, ipAddress: actor.ip })
}

export const revokeSchema = z.object({ reason })

export async function revokeKey(actor: AdminActor, keyId: string, input: z.infer<typeof revokeSchema>) {
  const [k] = await getDb().update(schema.apiKey).set({ revokedAt: new Date() }).where(and(eq(schema.apiKey.id, keyId), isNull(schema.apiKey.revokedAt))).returning()
  if (!k) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'api_key.revoked_by_admin', targetType: 'api_key', targetId: keyId, after: { workspaceId: k.workspaceId }, reason: input.reason, ipAddress: actor.ip })
}

export async function webhookDeliveries(filter: { status?: 'pending' | 'delivered' | 'failed'; q?: string; page?: number }) {
  const where: SQL[] = []
  if (filter.status) where.push(eq(schema.webhookDelivery.status, filter.status))
  if (filter.q) where.push(or(eq(schema.webhook.workspaceId, filter.q), eq(schema.webhookDelivery.webhookId, filter.q), eq(schema.webhookDelivery.event, filter.q))!)
  return getDb().select({
    id: schema.webhookDelivery.id, event: schema.webhookDelivery.event, status: schema.webhookDelivery.status, attempts: schema.webhookDelivery.attempts,
    responseCode: schema.webhookDelivery.responseCode, nextAttemptAt: schema.webhookDelivery.nextAttemptAt, createdAt: schema.webhookDelivery.createdAt,
    url: schema.webhook.url, workspaceId: schema.webhook.workspaceId, webhookId: schema.webhook.id,
  }).from(schema.webhookDelivery).innerJoin(schema.webhook, eq(schema.webhook.id, schema.webhookDelivery.webhookId))
    .where(where.length ? and(...where) : undefined).orderBy(desc(schema.webhookDelivery.createdAt)).limit(PAGE_SIZE).offset(((filter.page ?? 1) - 1) * PAGE_SIZE)
}

/* ------------------------------------------------------------------ system */

async function dirSize(dir: string): Promise<number | null> {
  let total = 0
  try {
    for (const e of await readdir(dir, { withFileTypes: true, recursive: true })) {
      if (e.isFile()) total += (await stat(path.join(e.parentPath, e.name))).size
    }
    return total
  } catch { return null }
}

/** Engine, storage and email facts for the System page. Health is measured, never assumed. */
export async function systemStatus() {
  const e = env()
  const { capabilities, isMock } = capabilitiesFor(e)
  const db = getDb()
  const since = sql`now() - interval '24 hours'`
  const [gen] = await db.select({
    total: count(), failed: sql<number>`count(*) filter (where ${schema.generation.status} = 'failed')::int`,
  }).from(schema.generation).where(gte(schema.generation.createdAt, since))
  let ping: { ok: boolean; ms: number; detail: string } | null = null
  const selfHosted = e.VOICE_ENGINE === 'voxcpm' ? { url: e.SELF_HOSTED_ENGINE_URL, token: e.SELF_HOSTED_ENGINE_TOKEN }
    : e.VOICE_ENGINE === 'kokoro' ? { url: e.MIXER_ENGINE_URL, token: e.MIXER_ENGINE_TOKEN } : null
  if (selfHosted?.url) {
    const t0 = Date.now()
    try {
      const r = await fetch(new URL('/v1/health', selfHosted.url), { headers: selfHosted.token ? { authorization: `Bearer ${selfHosted.token}` } : {}, signal: AbortSignal.timeout(5000) })
      ping = { ok: r.ok, ms: Date.now() - t0, detail: `HTTP ${r.status}` }
    } catch (err) {
      ping = { ok: false, ms: Date.now() - t0, detail: err instanceof Error ? err.message : String(err) }
    }
  }
  const [samples, uploads, outputs] = await Promise.all([
    db.select({ n: count(), bytes: sql<number>`coalesce(sum(${schema.voiceSample.bytes}), 0)::bigint` }).from(schema.voiceSample),
    db.select({ n: count(), bytes: sql<number>`coalesce(sum(${schema.upload.bytes}), 0)::bigint` }).from(schema.upload),
    db.select({ n: count() }).from(schema.generation).where(sql`${schema.generation.outputKey} is not null`),
  ])
  const local = e.STORAGE_DRIVER === 'local' ? await dirSize(e.STORAGE_LOCAL_DIR ?? path.join(e.MIMIX_DATA_DIR, 'storage')) : null
  return {
    engine: {
      id: e.VOICE_ENGINE, isMock, capabilities,
      configured: e.VOICE_ENGINE === 'mock' || (e.VOICE_ENGINE === 'inworld' ? !!e.INWORLD_API_KEY : e.VOICE_ENGINE === 'kokoro' ? !!e.MIXER_ENGINE_URL : !!e.SELF_HOSTED_ENGINE_URL),
      verifier: speakerVerifier(), last24h: { total: gen?.total ?? 0, failed: gen?.failed ?? 0 }, ping,
    },
    storage: {
      driver: e.STORAGE_DRIVER, localBytes: local,
      samples: { count: samples[0]?.n ?? 0, bytes: Number(samples[0]?.bytes ?? 0) },
      uploads: { count: uploads[0]?.n ?? 0, bytes: Number(uploads[0]?.bytes ?? 0) },
      outputs: outputs[0]?.n ?? 0,
    },
    email: { driver: e.EMAIL_DRIVER, from: e.EMAIL_FROM },
    queue: e.QUEUE_DRIVER,
  }
}

const SAMPLE_VALUES: Record<string, string | number> = {
  name: 'Avery', url: 'https://example.com/link', newEmail: 'new@example.com', count: 5, minutes: 15, reference: 'rpt_example', reason: 'no_consent',
  target: 'voice voice_example', role: 'admin', time: '2026-11-02 09:00 UTC', ip: '203.0.113.7', agent: 'Firefox on macOS', workspace: 'Avery’s workspace',
  inviter: 'Sam', title: 'Chapter one', module: 'Text to Speech', balance: '1,200', plan: 'Pro', amount: '$29.00', date: '9 November 2026', template: 'verify', preview: '…',
}

/** Every transactional email, filled with sample values, for the System page preview. */
export function emailTemplates() {
  const m = getMessages('en').emails as Record<string, unknown>
  return Object.entries(m).filter(([, v]) => typeof v === 'object' && v && 'subject' in v).map(([key, v]) => {
    const t = v as { subject: string; body: string }
    return { key, subject: fmt(t.subject, SAMPLE_VALUES), body: fmt(t.body, SAMPLE_VALUES) }
  })
}

export async function sendTestEmail(actor: AdminActor, key: string) {
  const tpl = emailTemplates().find((x) => x.key === key)
  if (!tpl) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  const m = getMessages('en').emails
  await sendEmail({ to: actor.email, subject: m.adminTest.subject, text: fmt(m.adminTest.body, { name: actor.name, template: key, preview: `${tpl.subject}\n\n${tpl.body}` }), tag: 'adminTest' })
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'email.test_sent', targetType: 'email_template', targetId: key, ipAddress: actor.ip })
}

/* ------------------------------------------------------------------ audit log */

export const auditSearchSchema = z.object({
  actor: z.string().trim().max(200).optional().default(''),
  action: z.string().trim().max(100).optional().default(''),
  target: z.string().trim().max(200).optional().default(''),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  /** Staff actions only (hides automatic and user-made entries). */
  staff: z.enum(['1']).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).optional().catch(1).default(1),
})

function auditWhere(f: z.infer<typeof auditSearchSchema>): SQL | undefined {
  const where: SQL[] = []
  if (f.actor) where.push(or(eq(schema.auditLog.actorId, f.actor), ilike(schema.user.email, `%${f.actor.replace(/[%_\\]/g, (c) => `\\${c}`)}%`))!)
  if (f.action) where.push(like(schema.auditLog.action, `${f.action.replace(/[%_\\]/g, (c) => `\\${c}`)}%`))
  if (f.target) where.push(eq(schema.auditLog.targetId, f.target))
  if (f.from) where.push(gte(schema.auditLog.createdAt, new Date(`${f.from}T00:00:00Z`)))
  if (f.to) where.push(lte(schema.auditLog.createdAt, new Date(`${f.to}T23:59:59.999Z`)))
  if (f.staff) where.push(and(sql`${schema.auditLog.actorRole} in ('owner','admin','moderator','support')`, ne(schema.auditLog.action, 'admin.sign_in'))!)
  return where.length ? and(...where) : undefined
}

export async function searchAudit(input: z.input<typeof auditSearchSchema>, limit = PAGE_SIZE) {
  const f = auditSearchSchema.parse(input)
  const rows = await getDb().select({ entry: schema.auditLog, email: schema.user.email }).from(schema.auditLog)
    .leftJoin(schema.user, eq(schema.user.id, schema.auditLog.actorId))
    .where(auditWhere(f)).orderBy(desc(schema.auditLog.createdAt)).limit(limit).offset((f.page - 1) * limit)
  return { rows, page: f.page, filters: f }
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s = typeof v === 'string' ? v : v instanceof Date ? v.toISOString() : JSON.stringify(v)
  // Spreadsheet formula injection: a cell starting with = + - @ is shown as text.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** The audit log as CSV (up to 50,000 rows, newest first), with the same filters as the page. */
export async function auditCsv(actor: AdminActor, input: z.input<typeof auditSearchSchema>): Promise<string> {
  const { rows } = await searchAudit({ ...input, page: 1 }, 50_000)
  const head = ['id', 'created_at', 'actor_id', 'actor_email', 'actor_role', 'action', 'target_type', 'target_id', 'reason', 'ip_address', 'before', 'after']
  const lines = rows.map(({ entry: r, email }) => [r.id, r.createdAt, r.actorId, email, r.actorRole, r.action, r.targetType, r.targetId, r.reason, r.ipAddress, r.before, r.after].map(csvCell).join(','))
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'audit.exported', after: { rows: rows.length, filters: input }, ipAddress: actor.ip })
  return [head.join(','), ...lines].join('\r\n') + '\r\n'
}

/* ------------------------------------------------------------------ overview */

export interface DayPoint { day: string; value: number }

function fillDays(rows: Array<{ day: string; value: number }>, days: number): DayPoint[] {
  const map = new Map(rows.map((r) => [r.day, Number(r.value)]))
  const out: DayPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
    out.push({ day: d, value: map.get(d) ?? 0 })
  }
  return out
}

/** Numbers for the overview, over the last `days` days (7, 30 or 90). */
export async function overview(days: 7 | 30 | 90 = 30) {
  const db = getDb()
  const since = new Date(Date.now() - (days - 1) * 86_400_000); since.setUTCHours(0, 0, 0, 0)
  const day = (col: AnyPgColumn) => sql<string>`to_char(${col} at time zone 'UTC', 'YYYY-MM-DD')`
  const [signups, active, gens, speech, minutes, revenue, failed, queue, openReports, pending, staffNo2fa, signupDays, genDays] = await Promise.all([
    db.select({ n: count() }).from(schema.user).where(gte(schema.user.createdAt, since)),
    db.select({ n: sql<number>`count(distinct ${schema.session.userId})::int` }).from(schema.session).where(gte(schema.session.updatedAt, since)),
    db.select({ n: count() }).from(schema.generation).where(gte(schema.generation.createdAt, since)),
    db.select({ n: sql<number>`coalesce(sum(${schema.generation.units}), 0)::bigint` }).from(schema.generation)
      .where(and(gte(schema.generation.createdAt, since), sql`${schema.generation.module} in ('tts','studio','studio_export','mix_preview','design')`, ne(schema.generation.status, 'failed'))),
    db.select({ n: sql<number>`coalesce(sum(${schema.generation.units}), 0)::bigint` }).from(schema.generation)
      .where(and(gte(schema.generation.createdAt, since), sql`${schema.generation.module} in ('stt','dubbing','changer','isolator')`, ne(schema.generation.status, 'failed'))),
    db.select({ n: sql<number>`coalesce(sum(${schema.invoice.amountPaid}), 0)::bigint` }).from(schema.invoice).where(and(gte(schema.invoice.createdAt, since), eq(schema.invoice.status, 'paid'))),
    db.select({ n: count() }).from(schema.generation).where(and(gte(schema.generation.createdAt, since), eq(schema.generation.status, 'failed'))),
    db.select({ status: schema.job.status, n: count(), oldest: sql<string | null>`min(${schema.job.createdAt})` }).from(schema.job)
      .where(sql`${schema.job.status} in ('queued','running') or (${schema.job.status} = 'failed' and ${schema.job.finishedAt} > now() - interval '24 hours')`).groupBy(schema.job.status),
    db.select({ n: count() }).from(schema.abuseReport).where(eq(schema.abuseReport.status, 'open')),
    db.select({ n: count() }).from(schema.voice).where(eq(schema.voice.publishStatus, 'pending')),
    db.select({ n: count() }).from(schema.user).where(and(sql`${schema.user.role} <> 'user'`, or(eq(schema.user.twoFactorEnabled, false), isNull(schema.user.twoFactorEnabled)))),
    db.select({ day: day(schema.user.createdAt), value: count() }).from(schema.user).where(gte(schema.user.createdAt, since)).groupBy(day(schema.user.createdAt)),
    db.select({ day: day(schema.generation.createdAt), value: count() }).from(schema.generation).where(gte(schema.generation.createdAt, since)).groupBy(day(schema.generation.createdAt)),
  ])
  const total = gens[0]?.n ?? 0
  const q = Object.fromEntries(queue.map((r) => [r.status, { n: r.n, oldest: r.oldest }]))
  return {
    days,
    signups: signups[0]?.n ?? 0,
    activeUsers: active[0]?.n ?? 0,
    generations: total,
    characters: Number(speech[0]?.n ?? 0),
    /** Audio inputs are stored in seconds. */
    minutes: Math.round(Number(minutes[0]?.n ?? 0) / 60),
    revenueCents: Number(revenue[0]?.n ?? 0),
    errorRate: total ? (failed[0]?.n ?? 0) / total : 0,
    failed: failed[0]?.n ?? 0,
    queue: {
      queued: q.queued?.n ?? 0, running: q.running?.n ?? 0, failed24h: q.failed?.n ?? 0,
      oldestWaitingMinutes: q.queued?.oldest ? Math.round((Date.now() - new Date(q.queued.oldest).getTime()) / 60_000) : null,
    },
    openReports: openReports[0]?.n ?? 0,
    pendingPublish: pending[0]?.n ?? 0,
    staffWithout2fa: staffNo2fa[0]?.n ?? 0,
    series: { signups: fillDays(signupDays, days), generations: fillDays(genDays, days) },
  }
}
