import 'server-only'
import { isIP } from 'node:net'
import { eq } from 'drizzle-orm'
import { headers as nextHeaders } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'
import { getAuth } from '@/server/auth'
import { getDb, schema } from '@/server/db'
import { env } from '@/server/env'
import { apiError, handleApiError } from '@/server/api/errors'
import { refreshPlans } from '@/server/plans'
import { ADMIN_SECURITY, adminCan, isStaff, type AdminPermission, type StaffRole } from '@/config/admin'
import { getMessages } from '@/i18n'

/**
 * Admin console access (brief section 8). Every /admin page and /api/admin route goes through
 * here, in this order:
 *  1. a signed-in staff account (anyone else gets a plain 404: the console is never advertised);
 *  2. the optional IP allowlist (ADMIN_IP_ALLOWLIST);
 *  3. two-factor sign-in turned on;
 *  4. the 15-minute idle lock (re-enter the password to continue);
 *  5. the role's permission for this section;
 *  6. for destructive actions, a re-authentication in the last 5 minutes.
 */

export interface AdminActor { id: string; email: string; name: string; role: StaffRole; sessionId: string; ip: string | null }

export type AdminCheck =
  | { ok: true; actor: AdminActor }
  | { ok: false; reason: 'signed_out' | 'not_staff' | 'ip_blocked' | 'two_factor' | 'locked' | 'forbidden' | 'reauth' }

const t = () => getMessages('en').errors.admin

function ipFrom(h: Headers): string | null {
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
}

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((n, p) => (n << 8) + Number(p), 0) >>> 0
}

/** True when ADMIN_IP_ALLOWLIST is unset, or the address matches an entry (exact IP or IPv4 CIDR). */
export function ipAllowed(ip: string | null, list = env().ADMIN_IP_ALLOWLIST): boolean {
  const entries = (list ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (!entries.length) return true
  if (!ip) return false
  const addr = ip.startsWith('::ffff:') ? ip.slice(7) : ip
  return entries.some((e) => {
    const [base, bits] = e.split('/')
    if (!bits) return base === addr
    if (isIP(base!) !== 4 || isIP(addr) !== 4) return false
    const n = Number(bits)
    if (!Number.isInteger(n) || n < 0 || n > 32) return false
    const mask = n === 0 ? 0 : (~0 << (32 - n)) >>> 0
    return (ipv4ToInt(base!) & mask) === (ipv4ToInt(addr) & mask)
  })
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000)

/**
 * Runs checks 1 to 6 for one request. `touch` records activity (resets the idle timer); pages and
 * API calls touch, the lock screen does not.
 */
export async function checkAdmin(h: Headers, opts: { permission?: AdminPermission; destructive?: boolean; touch?: boolean; allowWithout2fa?: boolean; allowLocked?: boolean } = {}): Promise<AdminCheck> {
  // Always read the session from the database here: the 5-minute cookie cache would keep a demoted or
  // signed-out staff member in the console until it expired.
  const s = await getAuth().api.getSession({ headers: h, query: { disableCookieCache: true } })
  if (!s) return { ok: false, reason: 'signed_out' }
  const u = s.user as typeof s.user & { role?: string; status?: string; twoFactorEnabled?: boolean | null }
  if (!isStaff(u.role) || (u.status && u.status !== 'active')) return { ok: false, reason: 'not_staff' }
  const ip = ipFrom(h)
  if (!ipAllowed(ip)) return { ok: false, reason: 'ip_blocked' }
  const actor: AdminActor = { id: u.id, email: u.email, name: u.name, role: u.role, sessionId: s.session.id, ip }
  if (!u.twoFactorEnabled && !opts.allowWithout2fa) return { ok: false, reason: 'two_factor' }

  const db = getDb()
  const [row] = await db.select().from(schema.adminSession).where(eq(schema.adminSession.sessionId, s.session.id))
  const idle = !!row && row.lastSeenAt < minutesAgo(ADMIN_SECURITY.idleMinutes)
  if (idle && !opts.allowLocked) return { ok: false, reason: 'locked' }
  if (opts.permission && !adminCan(u.role, opts.permission)) return { ok: false, reason: 'forbidden' }
  if (opts.destructive && !(row?.reauthAt && row.reauthAt > minutesAgo(ADMIN_SECURITY.reauthMinutes))) return { ok: false, reason: 'reauth' }

  if (opts.touch !== false && !idle) {
    if (row) await db.update(schema.adminSession).set({ lastSeenAt: new Date(), ipAddress: ip }).where(eq(schema.adminSession.sessionId, s.session.id))
    else await db.insert(schema.adminSession).values({ sessionId: s.session.id, userId: u.id, ipAddress: ip }).onConflictDoNothing()
  }
  return { ok: true, actor }
}

/** For /admin pages. Redirects or 404s on every failed check; returns the actor otherwise. */
export const requireAdminPage = cache(async (permission: AdminPermission, path: string): Promise<AdminActor> => {
  await refreshPlans()
  const r = await checkAdmin(await nextHeaders(), { permission })
  if (r.ok) return r.actor
  switch (r.reason) {
    case 'signed_out': redirect(`/sign-in?next=${encodeURIComponent(path)}`)
    case 'two_factor': redirect('/admin/two-factor')
    case 'locked': redirect(`/admin/unlock?next=${encodeURIComponent(path)}`)
    case 'forbidden': redirect('/admin?denied=1')
    default: notFound()
  }
})

/** Same-origin check for state-changing admin calls (cookies are SameSite=Lax; this closes the rest). */
function sameOrigin(req: Request): boolean {
  if (req.method === 'GET' || req.method === 'HEAD') return true
  const origin = req.headers.get('origin')
  if (!origin) return true
  try { return new URL(origin).origin === new URL(env().APP_URL).origin } catch { return false }
}

type Ctx<P> = { params: Promise<P> }

/**
 * Wraps an /api/admin handler. Failures answer with a code the console understands:
 * 404 (not staff), 403 two_factor_required / forbidden, 423 admin_locked, 428 reauth_required.
 */
export function adminRoute<P = Record<string, string>>(
  opts: { permission: AdminPermission; destructive?: boolean },
  handler: (req: Request, actor: AdminActor, params: P) => Promise<Response>,
) {
  return async (req: Request, ctx: Ctx<P>): Promise<Response> => {
    try {
      if (!sameOrigin(req)) return apiError(403, 'bad_origin', t().forbidden)
      await refreshPlans()
      const r = await checkAdmin(req.headers, opts)
      if (!r.ok) {
        switch (r.reason) {
          case 'signed_out': return apiError(401, 'unauthenticated', getMessages('en').errors.app.unauthenticated)
          case 'two_factor': return apiError(403, 'two_factor_required', t().twoFactorRequired)
          case 'locked': return apiError(423, 'admin_locked', t().locked)
          case 'forbidden': return apiError(403, 'forbidden', t().forbidden)
          case 'reauth': return apiError(428, 'reauth_required', t().reauthRequired)
          default: return apiError(404, 'not_found', getMessages('en').errors.app.notFound)
        }
      }
      return await handler(req, r.actor, (await ctx?.params) ?? ({} as P))
    } catch (err) {
      return handleApiError(err)
    }
  }
}
