/**
 * Fixed-window rate limiter kept in memory. Good for a single server and for development.
 * Phase 4 swaps the store for Redis so limits hold across instances; the call signature stays.
 */
const windows = new Map<string, { count: number; resetAt: number }>()

export interface RateLimitResult { ok: boolean; remaining: number; retryAfterSeconds: number }

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const entry = windows.get(key)
  if (!entry || entry.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    if (windows.size > 10_000) for (const [k, e] of windows) if (e.resetAt <= now) windows.delete(k)
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }
  entry.count++
  const ok = entry.count <= limit
  return { ok, remaining: Math.max(0, limit - entry.count), retryAfterSeconds: ok ? 0 : Math.ceil((entry.resetAt - now) / 1000) }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return `${scope}:${fwd || req.headers.get('x-real-ip') || 'local'}`
}

export function tooManyRequests(retryAfterSeconds: number): Response {
  return Response.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } })
}
