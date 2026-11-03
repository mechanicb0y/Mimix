import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, securityHeaders } from '@/config/security-headers'

describe('security headers', () => {
  it('locks down production: no eval, no framing, no plugins, HSTS on', () => {
    const csp = contentSecurityPolicy({ dev: false })
    expect(csp).toContain("default-src 'self'")
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain('upgrade-insecure-requests')
    const keys = securityHeaders({ dev: false }).map((h) => h.key)
    expect(keys).toEqual(expect.arrayContaining(['Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Cross-Origin-Opener-Policy', 'Permissions-Policy']))
  })
  it('allows only the Sentry ingest origin as an extra connection', () => {
    const csp = contentSecurityPolicy({ dev: false, sentryDsn: 'https://abc@o123.ingest.us.sentry.io/456' })
    expect(csp).toContain("connect-src 'self' https://o123.ingest.us.sentry.io")
    expect(contentSecurityPolicy({ dev: false, sentryDsn: 'not a url' })).toContain("connect-src 'self';")
  })
})
