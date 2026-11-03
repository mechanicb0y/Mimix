import 'server-only'
import { env } from '@/server/env'
import { registerJobHandler } from '@/server/jobs'

/**
 * End-to-end tests only: a job that counts up slowly, so a browser test can change page while it
 * runs. It refuses to run unless ENABLE_TEST_ROUTES=1 (never set in production).
 */
registerJobHandler('test_slow', async (ctx) => {
  if (!env().ENABLE_TEST_ROUTES) throw new Error('Test jobs are off')
  const steps = Math.min(40, Number(ctx.job.input.steps ?? 10))
  for (let i = 1; i <= steps; i++) {
    await new Promise((r) => setTimeout(r, 500))
    await ctx.checkCancelled()
    await ctx.progress((i / steps) * 100)
  }
  return {}
})
