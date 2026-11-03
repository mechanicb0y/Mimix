import 'server-only'
import { getDb, schema } from '@/server/db'
import { applyPlanOverrides, type Plan, type PlanOverride } from '@/config/plans'

/** How long a server instance trusts its copy of the admin's plan edits. */
const TTL_MS = 30_000
let loadedAt = 0
let pending: Promise<void> | null = null

/**
 * Loads the admin's plan edits (plan_setting) into the plan registry, at most every 30 seconds.
 * Called by the request entry points (API wrapper, app shell, pricing, webhooks, sweeps), so
 * getPlan() everywhere after it sees the edited values. A database error keeps the last copy.
 */
export async function refreshPlans(force = false): Promise<void> {
  if (!force && Date.now() - loadedAt < TTL_MS) return
  pending ??= (async () => {
    try {
      const rows = await getDb().select().from(schema.planSetting)
      const next: Partial<Record<Plan['id'], PlanOverride>> = {}
      for (const r of rows) {
        const o: PlanOverride = {}
        if (r.prices) o.prices = r.prices as Plan['prices']
        if (r.creditsPerMonth !== null) o.creditsPerMonth = r.creditsPerMonth
        if (r.seats !== null) o.seats = r.seats
        if (r.customVoices !== null) o.customVoices = r.customVoices
        if (r.professionalClones !== null) o.professionalClones = r.professionalClones
        if (r.mixerSources === 2 || r.mixerSources === 3) o.mixerSources = r.mixerSources
        next[r.planId] = o
      }
      applyPlanOverrides(next)
      loadedAt = Date.now()
    } catch (e) {
      console.error('[plans] could not load plan settings; using the last known values', e)
    } finally {
      pending = null
    }
  })()
  return pending
}
