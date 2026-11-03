import 'server-only'
import { refreshPlans } from '@/server/plans'
import { deleteStaleUploads } from '@/server/uploads'
import { resetDueCycles } from '@/server/billing'
import { retryDueWebhooks } from '@/server/modules/developers'
import { deleteExpiredExports, purgeDeletedAccounts } from '@/server/modules/account'

/**
 * Housekeeping that runs on a schedule: the worker calls it every minute, or Vercel Cron calls
 * /api/cron/sweep. Every task is idempotent and safe to run on several machines at once.
 */
export const SWEEPS = {
  webhooks: retryDueWebhooks,
  uploads: deleteStaleUploads,
  creditCycles: resetDueCycles,
  exports: deleteExpiredExports,
  deletions: purgeDeletedAccounts,
} as const

export async function runSweeps(now = new Date()): Promise<Record<keyof typeof SWEEPS, number | string>> {
  await refreshPlans()
  const out = {} as Record<keyof typeof SWEEPS, number | string>
  for (const [name, fn] of Object.entries(SWEEPS) as Array<[keyof typeof SWEEPS, (d: Date) => Promise<number>]>) {
    try { out[name] = await fn(now) } catch (e) { console.error(`[sweep] ${name}`, e); out[name] = 'failed' }
  }
  return out
}
