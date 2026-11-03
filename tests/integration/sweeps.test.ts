import { afterEach, describe, expect, it } from 'vitest'
import { GET as cron } from '@/app/api/cron/sweep/route'
import { runSweeps } from '@/server/sweeps'
import { call } from '../support/fixtures'

describe('scheduled housekeeping', () => {
  afterEach(() => { delete process.env.CRON_SECRET })

  it('runs every sweep and reports counts', async () => {
    const r = await runSweeps()
    expect(Object.keys(r).sort()).toEqual(['creditCycles', 'deletions', 'exports', 'uploads', 'webhooks'])
    for (const v of Object.values(r)) expect(typeof v).toBe('number')
  })

  it('the cron route is off without CRON_SECRET and needs the bearer secret', async () => {
    expect((await call(cron)).status).toBe(401)
    process.env.CRON_SECRET = 'a-long-cron-secret-value'
    const { resetEnvForTests } = await import('@/server/env')
    resetEnvForTests()
    expect((await call(cron, { headers: { authorization: 'Bearer wrong-secret-value-xxxxx' } })).status).toBe(401)
    const ok = await call(cron, { headers: { authorization: 'Bearer a-long-cron-secret-value' } })
    expect(ok.status).toBe(200)
    expect(ok.data).toHaveProperty('webhooks')
  })
})
