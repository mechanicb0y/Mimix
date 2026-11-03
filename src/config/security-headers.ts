/**
 * Security headers for every response (next.config.ts). Kept in one place so a test can check them.
 *
 * Content Security Policy: scripts only from this site. Next.js streams page data as inline
 * <script> tags, so script-src needs 'unsafe-inline' unless every page is rendered per request with
 * a nonce, which would end static rendering of the marketing site (DECISIONS 2026-11-02). Everything
 * else is locked down: no plugins, no framing, no foreign forms, no foreign connections except the
 * error monitor. User content is never rendered as HTML (React escapes it; JSON-LD escapes "<").
 */
export interface HeaderEnv { dev: boolean; sentryDsn?: string }

export function sentryOrigin(dsn?: string): string | null {
  if (!dsn) return null
  try { return new URL(dsn).origin } catch { return null }
}

export function contentSecurityPolicy({ dev, sentryDsn }: HeaderEnv): string {
  const sentry = sentryOrigin(sentryDsn)
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // 'unsafe-eval' only in development, for React Refresh.
    'script-src': ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'media-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", ...(sentry ? [sentry] : []), ...(dev ? ['ws:'] : [])],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    // Stripe Checkout and the billing portal are full-page redirects, not form posts.
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  }
  const csp = Object.entries(directives).map(([k, v]) => `${k} ${v.join(' ')}`)
  if (!dev) csp.push('upgrade-insecure-requests')
  return csp.join('; ')
}

export function securityHeaders(env: HeaderEnv): Array<{ key: string; value: string }> {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(env) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self), payment=(), usb=(), interest-cohort=()' },
    // Two years, as the HSTS preload list asks. Browsers ignore it on plain http (local development).
    ...(env.dev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
  ]
}
