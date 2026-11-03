import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { getAuth } from '@/server/auth'
import { getDb, schema } from '@/server/db'
import type { ApiScope, WorkspaceRole } from '@/server/db/schema'
import { anyMembership, can, getMembership, type Permission } from '@/server/workspaces'
import { hit } from '@/server/rate-limit'
import { apiError } from '@/server/api/errors'
import { getMessages, fmt } from '@/i18n'
import { OWNER_RATE_MULTIPLIER } from '@/config/admin'
import { sameOrigin } from '@/lib/forms'

/**
 * Authenticates an API request, by browser session (cookie) or by API key
 * (`Authorization: Bearer mmx_…` or `x-api-key: mmx_…`). API keys belong to a workspace, carry
 * scopes, and have their own per-minute rate limit.
 */
export type ApiAuth =
  | { ok: true; via: 'session' | 'api_key'; userId: string | null; workspaceId: string; role: WorkspaceRole; apiKeyId: string | null; unlimited: boolean; rateHeaders: Record<string, string>; /** Platform role of the signed-in user ('user' for API keys). */ platformRole: string }
  | { ok: false; response: Response }

export const API_KEY_PREFIX = 'mmx_'

export function hashApiKey(key: string): string { return createHash('sha256').update(key).digest('hex') }

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `${API_KEY_PREFIX}${randomBytes(24).toString('base64url')}`
  return { key, prefix: key.slice(0, 10), hash: hashApiKey(key) }
}

/** Which scope an API key needs for each permission. Session users are checked by role instead. */
const SESSION_RATE = { limit: 120, window: 60 }

/** scope 'any': every API key may call it (uploads, which only feed other scoped endpoints). */
export async function apiAuth(req: Request, permission: Permission, scope?: ApiScope | 'any'): Promise<ApiAuth> {
  const t = getMessages('en').errors.app
  const header = req.headers.get('authorization')
  const raw = req.headers.get('x-api-key') ?? (header?.startsWith('Bearer ') ? header.slice(7).trim() : null)
  if (raw?.startsWith(API_KEY_PREFIX)) {
    const [k] = await getDb().select({ key: schema.apiKey, ws: schema.workspace })
      .from(schema.apiKey).innerJoin(schema.workspace, eq(schema.workspace.id, schema.apiKey.workspaceId))
      .where(and(eq(schema.apiKey.hash, hashApiKey(raw)), isNull(schema.apiKey.revokedAt)))
    if (!k) return { ok: false, response: apiError(401, 'invalid_api_key', 'This API key is not valid or was revoked.') }
    // Keys stop working while the person who made them is suspended or banned.
    if (k.key.createdBy) {
      const [creator] = await getDb().select({ status: schema.user.status }).from(schema.user).where(eq(schema.user.id, k.key.createdBy))
      if (creator && creator.status !== 'active') return { ok: false, response: apiError(403, 'account_suspended', getMessages('en').errors.auth.accountSuspended) }
    }
    if (scope && scope !== 'any' && !k.key.scopes.includes(scope)) return { ok: false, response: apiError(403, 'missing_scope', `This API key needs the "${scope}" scope.`, { scope }) }
    if (!scope && !['viewContent', 'viewUsage'].includes(permission)) return { ok: false, response: apiError(403, 'forbidden', t.forbidden) }
    // The super-admin's workspaces get higher product limits (brief section 8).
    const keyLimit = k.key.rateLimitPerMinute * (k.ws.unlimited ? OWNER_RATE_MULTIPLIER : 1)
    const rl = await hit(`api:${k.key.id}`, keyLimit, 60)
    const rateHeaders = { 'X-RateLimit-Limit': String(keyLimit), 'X-RateLimit-Remaining': String(rl.remaining) }
    if (!rl.ok) return { ok: false, response: apiError(429, 'rate_limited', fmt(t.rateLimited, { seconds: rl.retryAfterSeconds }), {}, { 'Retry-After': String(rl.retryAfterSeconds), ...rateHeaders }) }
    void getDb().update(schema.apiKey).set({ lastUsedAt: new Date() }).where(eq(schema.apiKey.id, k.key.id)).catch(() => {})
    return { ok: true, via: 'api_key', userId: k.key.createdBy, workspaceId: k.ws.id, role: 'member', apiKeyId: k.key.id, unlimited: k.ws.unlimited, rateHeaders, platformRole: 'user' }
  }

  // Cookie-authenticated writes must come from our own pages (defence in depth on top of SameSite=Lax).
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && (!sameOrigin(req) || req.headers.get('sec-fetch-site') === 'cross-site')) {
    return { ok: false, response: apiError(403, 'bad_origin', t.forbidden) }
  }
  const session = await getAuth().api.getSession({ headers: req.headers })
  if (!session) return { ok: false, response: apiError(401, 'unauthenticated', t.unauthenticated) }
  const user = session.user as typeof session.user & { defaultWorkspaceId?: string | null; status?: string }
  if (user.status && user.status !== 'active') return { ok: false, response: apiError(403, 'account_suspended', getMessages('en').errors.auth.accountSuspended) }
  const chosen = req.headers.get('x-workspace-id') ?? (await cookies()).get('mimix_ws')?.value ?? user.defaultWorkspaceId
  const m = chosen ? await getMembership(chosen, user.id) : null
  const membership = m ?? (user.defaultWorkspaceId ? await getMembership(user.defaultWorkspaceId, user.id) : null) ?? await anyMembership(user.id)
  if (!membership) return { ok: false, response: apiError(403, 'forbidden', t.forbidden) }
  if (!can(membership.role, permission)) return { ok: false, response: apiError(403, 'forbidden', t.forbidden) }
  const rl = await hit(`session:${user.id}`, SESSION_RATE.limit * (membership.workspace.unlimited ? OWNER_RATE_MULTIPLIER : 1), SESSION_RATE.window)
  if (!rl.ok) return { ok: false, response: apiError(429, 'rate_limited', fmt(t.rateLimited, { seconds: rl.retryAfterSeconds }), {}, { 'Retry-After': String(rl.retryAfterSeconds) }) }
  return { ok: true, via: 'session', userId: user.id, workspaceId: membership.workspace.id, role: membership.role, apiKeyId: null, unlimited: membership.workspace.unlimited, rateHeaders: {}, platformRole: (user as { role?: string }).role ?? 'user' }
}

/** Best-effort client IP for consent and audit records (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null
}
