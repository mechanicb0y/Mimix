import { describe, expect, it } from 'vitest'
import { clientKey, rateLimit } from '@/lib/rate-limit'

describe('rateLimit', () => {
  it('allows up to the limit, then blocks until the window resets', () => {
    const t = 1_000_000
    for (let i = 0; i < 3; i++) expect(rateLimit('k1', 3, 60_000, t).ok).toBe(true)
    const blocked = rateLimit('k1', 3, 60_000, t + 1000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSeconds).toBe(59)
    expect(rateLimit('k1', 3, 60_000, t + 60_000).ok).toBe(true)
  })
  it('keeps keys separate', () => {
    expect(rateLimit('k2', 1, 1000, 0).ok).toBe(true)
    expect(rateLimit('k3', 1, 1000, 0).ok).toBe(true)
  })
  it('keys by the first forwarded address', () => {
    const req = new Request('http://x', { headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } })
    expect(clientKey(req, 'tts')).toBe('tts:203.0.113.9')
    expect(clientKey(new Request('http://x'), 'tts')).toBe('tts:local')
  })
})
