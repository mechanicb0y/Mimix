import { getDb, schema } from '@/server/db'
import { newId } from '@/server/ids'
import { generateApiKey } from '@/server/api/auth'
import type { ApiScope } from '@/server/db/schema'
import { API_SCOPES } from '@/server/db/schema'

/** A user, a workspace with credits, and an API key with the given scopes. */
export async function workspaceWithKey(opts: { credits?: number; scopes?: ApiScope[]; plan?: 'free' | 'pro'; rateLimitPerMinute?: number; creditLimit?: number } = {}) {
  const userId = newId('usr')
  await getDb().insert(schema.user).values({ id: userId, name: 'Test User', email: `${userId}@example.test`, emailVerified: true })
  const workspaceId = newId('ws')
  await getDb().insert(schema.workspace).values({ id: workspaceId, name: 'Test', planId: opts.plan ?? 'pro', creditBalance: opts.credits ?? 100_000 })
  await getDb().insert(schema.workspaceMember).values({ workspaceId, userId, role: 'owner' })
  const k = generateApiKey()
  await getDb().insert(schema.apiKey).values({ id: newId('key'), workspaceId, createdBy: userId, name: 'test', prefix: k.prefix, hash: k.hash, scopes: opts.scopes ?? [...API_SCOPES], rateLimitPerMinute: opts.rateLimitPerMinute ?? 1000, creditLimit: opts.creditLimit ?? null })
  return { userId, workspaceId, key: k.key }
}

/** Calls a Next route handler like the framework would. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (req: Request, ctx: { params: Promise<any> }) => Promise<Response>

export async function call(handler: AnyHandler, opts: { method?: string; path?: string; key?: string; json?: unknown; params?: Record<string, unknown>; headers?: Record<string, string>; body?: Uint8Array } = {}) {
  const req = new Request(`http://localhost:3000${opts.path ?? '/'}`, {
    method: opts.method ?? (opts.json === undefined ? 'GET' : 'POST'),
    headers: { ...(opts.key ? { authorization: `Bearer ${opts.key}` } : {}), ...(opts.json !== undefined ? { 'content-type': 'application/json' } : {}), ...opts.headers },
    body: opts.body ? new Blob([opts.body as BlobPart]) : opts.json === undefined ? undefined : JSON.stringify(opts.json),
  })
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) })
  const text = await res.clone().text()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = null
  try { data = JSON.parse(text) } catch { data = null }
  return { res, status: res.status, data }
}
