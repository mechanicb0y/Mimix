import 'server-only'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { randomBytes } from 'node:crypto'
import { and, arrayContains, desc, eq, gte, isNull, lt, lte, sql } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import { env } from '@/server/env'
import { newId } from '@/server/ids'
import { audit } from '@/server/audit'
import { background } from '@/server/jobs'
import { generateApiKey } from '@/server/api/auth'
import { UserError } from '@/server/api/errors'
import { decryptSecret, encryptSecret, signWebhook } from '@/server/crypto'
import type { WebhookEvent } from '@/config/api'
import type { keyCreateSchema, keyPatchSchema, webhookCreateSchema, webhookPatchSchema } from '@/lib/schemas/developers'
import { getMessages } from '@/i18n'
import type { z } from 'zod'

const errs = () => getMessages('en').errors.app.developers
type KeyRow = typeof schema.apiKey.$inferSelect
type HookRow = typeof schema.webhook.$inferSelect

/* ------------------------------------------------------------------ API keys */

export const MAX_KEYS = 50

function keyView(k: KeyRow, usedThisMonth = 0) {
  return {
    id: k.id, name: k.name, prefix: k.prefix, scopes: k.scopes, rateLimitPerMinute: k.rateLimitPerMinute, creditLimit: k.creditLimit,
    creditsThisMonth: usedThisMonth, lastUsedAt: k.lastUsedAt, createdAt: k.createdAt, revokedAt: k.revokedAt,
  }
}

const monthStart = () => { const d = new Date(); d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0); return d }

export async function listKeys(workspaceId: string) {
  const db = getDb()
  const keys = await db.select().from(schema.apiKey).where(eq(schema.apiKey.workspaceId, workspaceId)).orderBy(desc(schema.apiKey.createdAt))
  const used = await db.select({ id: schema.generation.apiKeyId, n: sql<number>`coalesce(sum(${schema.generation.credits}), 0)::int` }).from(schema.generation)
    .where(and(eq(schema.generation.workspaceId, workspaceId), gte(schema.generation.createdAt, monthStart()), sql`${schema.generation.status} <> 'failed'`, sql`${schema.generation.apiKeyId} is not null`))
    .groupBy(schema.generation.apiKeyId)
  const by = new Map(used.map((u) => [u.id, u.n]))
  return keys.map((k) => keyView(k, by.get(k.id) ?? 0))
}

/** Creates a key. The full key is returned once and never stored (only its sha256). */
export async function createKey(workspaceId: string, userId: string | null, input: z.infer<typeof keyCreateSchema>) {
  const [n] = await getDb().select({ n: sql<number>`count(*)::int` }).from(schema.apiKey).where(and(eq(schema.apiKey.workspaceId, workspaceId), isNull(schema.apiKey.revokedAt)))
  if ((n?.n ?? 0) >= MAX_KEYS) throw new UserError('key_limit', errs().keyLimit, 409)
  const k = generateApiKey()
  const [row] = await getDb().insert(schema.apiKey).values({
    id: newId('key'), workspaceId, createdBy: userId, name: input.name, prefix: k.prefix, hash: k.hash, scopes: input.scopes,
    rateLimitPerMinute: input.rateLimitPerMinute, creditLimit: input.creditLimit ?? null,
  }).returning()
  await audit({ actorId: userId, action: 'api_key.created', targetType: 'api_key', targetId: row!.id, after: { name: input.name, scopes: input.scopes } })
  return { key: k.key, apiKey: keyView(row!) }
}

async function ownKey(workspaceId: string, id: string) {
  const [k] = await getDb().select().from(schema.apiKey).where(and(eq(schema.apiKey.id, id), eq(schema.apiKey.workspaceId, workspaceId)))
  if (!k) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  return k
}

export async function updateKey(workspaceId: string, id: string, input: z.infer<typeof keyPatchSchema>) {
  const k = await ownKey(workspaceId, id)
  const [row] = await getDb().update(schema.apiKey).set({ ...(input.name ? { name: input.name } : {}), ...(input.creditLimit !== undefined ? { creditLimit: input.creditLimit } : {}) }).where(eq(schema.apiKey.id, k.id)).returning()
  return keyView(row!)
}

/** Revoking is immediate and permanent; the row stays so usage history keeps its name. */
export async function revokeKey(workspaceId: string, id: string, actorId: string | null) {
  const k = await ownKey(workspaceId, id)
  if (!k.revokedAt) await getDb().update(schema.apiKey).set({ revokedAt: new Date() }).where(eq(schema.apiKey.id, k.id))
  await audit({ actorId, action: 'api_key.revoked', targetType: 'api_key', targetId: k.id })
}

/* ------------------------------------------------------------------ usage */

/** Credits and requests per day and per module, plus totals per key, for [from, to). Defaults to the last 30 days including today. */
export async function usage(workspaceId: string, q: { from?: Date; to?: Date; apiKeyId?: string }) {
  const to = q.to ?? new Date()
  // Default: today and the 29 days before it, as whole UTC days.
  const from = q.from ?? new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) - 29 * 86_400_000)
  const where = [eq(schema.generation.workspaceId, workspaceId), gte(schema.generation.createdAt, from), lt(schema.generation.createdAt, to), sql`${schema.generation.status} <> 'failed'`]
  if (q.apiKeyId) where.push(eq(schema.generation.apiKeyId, q.apiKeyId))
  const db = getDb()
  const day = sql<string>`to_char(date_trunc('day', ${schema.generation.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`
  const rows = await db.select({ day, module: schema.generation.module, credits: sql<number>`sum(${schema.generation.credits})::int`, requests: sql<number>`count(*)::int` })
    .from(schema.generation).where(and(...where)).groupBy(day, schema.generation.module).orderBy(day)
  const byKey = await db.select({ apiKeyId: schema.generation.apiKeyId, credits: sql<number>`sum(${schema.generation.credits})::int`, requests: sql<number>`count(*)::int` })
    .from(schema.generation).where(and(...where)).groupBy(schema.generation.apiKeyId)
  const days: Array<{ day: string; credits: number; requests: number; modules: Record<string, number> }> = []
  for (let d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())); d < to; d = new Date(d.getTime() + 86_400_000)) {
    days.push({ day: d.toISOString().slice(0, 10), credits: 0, requests: 0, modules: {} })
  }
  const idx = new Map(days.map((d, i) => [d.day, i]))
  for (const r of rows) {
    const d = days[idx.get(r.day) ?? -1]
    if (!d) continue
    d.credits += r.credits; d.requests += r.requests; d.modules[r.module] = (d.modules[r.module] ?? 0) + r.credits
  }
  const modules: Record<string, number> = {}
  for (const r of rows) modules[r.module] = (modules[r.module] ?? 0) + r.credits
  return {
    from: from.toISOString(), to: to.toISOString(),
    totals: { credits: rows.reduce((n, r) => n + r.credits, 0), requests: rows.reduce((n, r) => n + r.requests, 0) },
    modules, days, keys: byKey.map((k) => ({ apiKeyId: k.apiKeyId, credits: k.credits, requests: k.requests })),
  }
}

/* ------------------------------------------------------------------ webhooks */

export const MAX_WEBHOOKS = 10
/** Seconds to wait before each retry; the delivery fails for good after the last one. */
export const RETRY_DELAYS = [60, 300, 1800, 7200, 21600]

function hookView(h: HookRow) {
  return { id: h.id, url: h.url, events: h.events, active: h.active, createdAt: h.createdAt }
}

/**
 * Refuses URLs that point inside our network (SSRF): loopback, private, link-local and metadata
 * addresses, by literal IP and by DNS. Development allows http://localhost so receivers can be tested.
 */
export async function assertPublicUrl(raw: string) {
  const t = errs()
  const u = new URL(raw)
  const dev = env().NODE_ENV !== 'production'
  if (u.protocol !== 'https:' && !(dev && u.protocol === 'http:')) throw new UserError('webhook_url', t.httpsOnly, 422, { url: t.httpsOnly })
  if (u.username || u.password) throw new UserError('webhook_url', t.noCredentials, 422, { url: t.noCredentials })
  if (dev) return
  const host = u.hostname.replace(/^\[|\]$/g, '')
  const addrs = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address)
  if (!addrs.length) throw new UserError('webhook_url', t.unresolvable, 422, { url: t.unresolvable })
  if (addrs.some(isPrivateAddress)) throw new UserError('webhook_url', t.privateAddress, 422, { url: t.privateAddress })
}

export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip
  if (isIP(v4) === 4) {
    const [a, b] = v4.split('.').map(Number) as [number, number]
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  const l = ip.toLowerCase()
  return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80')
}

const newSecret = () => `whsec_${randomBytes(24).toString('base64url')}`

export async function listWebhooks(workspaceId: string) {
  const rows = await getDb().select().from(schema.webhook).where(eq(schema.webhook.workspaceId, workspaceId)).orderBy(desc(schema.webhook.createdAt))
  return rows.map(hookView)
}

/** The signing secret is returned once here (and on rotate); it's stored encrypted. */
export async function createWebhook(workspaceId: string, actorId: string | null, input: z.infer<typeof webhookCreateSchema>) {
  await assertPublicUrl(input.url)
  const [n] = await getDb().select({ n: sql<number>`count(*)::int` }).from(schema.webhook).where(eq(schema.webhook.workspaceId, workspaceId))
  if ((n?.n ?? 0) >= MAX_WEBHOOKS) throw new UserError('webhook_limit', errs().webhookLimit, 409)
  const secret = newSecret()
  const [row] = await getDb().insert(schema.webhook).values({ id: newId('whk'), workspaceId, url: input.url, events: input.events, secretEnc: encryptSecret(secret) }).returning()
  await audit({ actorId, action: 'webhook.created', targetType: 'webhook', targetId: row!.id, after: { url: input.url, events: input.events } })
  return { secret, webhook: hookView(row!) }
}

async function ownHook(workspaceId: string, id: string) {
  const [h] = await getDb().select().from(schema.webhook).where(and(eq(schema.webhook.id, id), eq(schema.webhook.workspaceId, workspaceId)))
  if (!h) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  return h
}

export async function updateWebhook(workspaceId: string, id: string, input: z.infer<typeof webhookPatchSchema>) {
  const h = await ownHook(workspaceId, id)
  if (input.url) await assertPublicUrl(input.url)
  const [row] = await getDb().update(schema.webhook).set({ ...(input.url ? { url: input.url } : {}), ...(input.events ? { events: input.events } : {}), ...(input.active !== undefined ? { active: input.active } : {}) })
    .where(eq(schema.webhook.id, h.id)).returning()
  return hookView(row!)
}

export async function rotateWebhookSecret(workspaceId: string, id: string, actorId: string | null) {
  const h = await ownHook(workspaceId, id)
  const secret = newSecret()
  await getDb().update(schema.webhook).set({ secretEnc: encryptSecret(secret) }).where(eq(schema.webhook.id, h.id))
  await audit({ actorId, action: 'webhook.secret_rotated', targetType: 'webhook', targetId: h.id })
  return { secret }
}

export async function deleteWebhook(workspaceId: string, id: string, actorId: string | null) {
  const h = await ownHook(workspaceId, id)
  await getDb().delete(schema.webhook).where(eq(schema.webhook.id, h.id))
  await audit({ actorId, action: 'webhook.deleted', targetType: 'webhook', targetId: h.id })
}

export async function listDeliveries(workspaceId: string, id: string) {
  const h = await ownHook(workspaceId, id)
  const rows = await getDb().select().from(schema.webhookDelivery).where(eq(schema.webhookDelivery.webhookId, h.id)).orderBy(desc(schema.webhookDelivery.createdAt)).limit(50)
  return rows.map((d) => ({ id: d.id, event: d.event, status: d.status, attempts: d.attempts, responseCode: d.responseCode, nextAttemptAt: d.nextAttemptAt, createdAt: d.createdAt, payload: d.payload }))
}

/** Sends a "ping" event to one endpoint now and returns how it went. */
export async function testWebhook(workspaceId: string, id: string) {
  const h = await ownHook(workspaceId, id)
  const d = await queueDelivery(h, 'ping', { message: 'This is a test event from Mimix.' })
  await attemptDelivery(d.id)
  const [row] = await getDb().select().from(schema.webhookDelivery).where(eq(schema.webhookDelivery.id, d.id))
  return { status: row!.status, responseCode: row!.responseCode, attempts: row!.attempts }
}

async function queueDelivery(h: HookRow, event: string, data: Record<string, unknown>) {
  const id = newId('evt')
  const payload = { id, type: event, createdAt: new Date().toISOString(), workspaceId: h.workspaceId, data }
  const [d] = await getDb().insert(schema.webhookDelivery).values({ id, webhookId: h.id, event, payload, nextAttemptAt: new Date() }).returning()
  return d!
}

/** Records an event for every active webhook that subscribes to it and starts delivering it. */
export async function emitEvent(workspaceId: string, event: WebhookEvent, data: Record<string, unknown>) {
  const hooks = await getDb().select().from(schema.webhook)
    .where(and(eq(schema.webhook.workspaceId, workspaceId), eq(schema.webhook.active, true), arrayContains(schema.webhook.events, [event])))
  for (const h of hooks) {
    const d = await queueDelivery(h, event, data)
    background(() => attemptDelivery(d.id))
  }
}

/** One delivery attempt: signed POST, 10 s timeout, any 2xx counts. Schedules the next retry on failure. */
export async function attemptDelivery(deliveryId: string) {
  const db = getDb()
  const [d] = await db.select({ d: schema.webhookDelivery, h: schema.webhook }).from(schema.webhookDelivery)
    .innerJoin(schema.webhook, eq(schema.webhook.id, schema.webhookDelivery.webhookId)).where(eq(schema.webhookDelivery.id, deliveryId))
  if (!d || d.d.status !== 'pending') return
  const body = JSON.stringify(d.d.payload)
  let code: number | null = null
  try {
    await assertPublicUrl(d.h.url)
    const res = await fetch(d.h.url, {
      method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(10_000),
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mimix-Webhooks/1', 'Mimix-Event': d.d.event, 'Mimix-Delivery': d.d.id, 'Mimix-Signature': signWebhook(decryptSecret(d.h.secretEnc), body) },
      body,
    })
    code = res.status
    await res.body?.cancel().catch(() => {})
  } catch { code = null }
  const attempts = d.d.attempts + 1
  const ok = code !== null && code >= 200 && code < 300
  const delay = RETRY_DELAYS[attempts - 1]
  await db.update(schema.webhookDelivery).set({
    attempts, responseCode: code, status: ok ? 'delivered' : delay === undefined ? 'failed' : 'pending',
    nextAttemptAt: ok || delay === undefined ? null : new Date(Date.now() + delay * 1000),
  }).where(eq(schema.webhookDelivery.id, d.d.id))
}

/** Worker sweep: retries deliveries whose next attempt is due. */
export async function retryDueWebhooks(now = new Date()): Promise<number> {
  const due = await getDb().select({ id: schema.webhookDelivery.id }).from(schema.webhookDelivery)
    .where(and(eq(schema.webhookDelivery.status, 'pending'), lte(schema.webhookDelivery.nextAttemptAt, now))).limit(200)
  for (const d of due) await attemptDelivery(d.id)
  return due.length
}
