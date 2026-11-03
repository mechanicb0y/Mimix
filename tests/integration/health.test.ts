import { describe, expect, it } from 'vitest'
import { GET } from '@/app/api/health/route'

describe('health check', () => {
  it('answers 200 with the database reachable, and reveals nothing else', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await res.json()
    expect(Object.keys(body).sort()).toEqual(['db', 'ms', 'ok'])
    expect(body).toMatchObject({ ok: true, db: 'ok' })
  })
})
