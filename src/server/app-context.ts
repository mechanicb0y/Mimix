import 'server-only'
import { cache } from 'react'
import { and, count, eq, isNull } from 'drizzle-orm'
import { requireWorkspace } from '@/server/session'
import { listWorkspaces } from '@/server/workspaces'
import { getBalance } from '@/server/credits'
import { getDb, schema } from '@/server/db'
import { cloningAllowed, engineFeatures, getVoiceEngine } from '@/server/engine'
import { effectivePlan } from '@/config/plans'
import { refreshPlans } from '@/server/plans'
import { flagsFor } from '@/server/flags'
import { publicStatus } from '@/server/settings'
import { isStaff } from '@/config/admin'
import { DELETION_GRACE_DAYS } from '@/lib/schemas/account'

/** Everything the app shell needs, loaded once per request. */
export const getAppContext = cache(async (next = '/app') => {
  const ctx = await requireWorkspace('viewContent', next)
  await refreshPlans()
  const [balance, workspaces, unread, me] = await Promise.all([
    getBalance(ctx.workspace.id),
    listWorkspaces(ctx.user.id),
    getDb().select({ n: count() }).from(schema.notification).where(and(eq(schema.notification.userId, ctx.user.id), isNull(schema.notification.readAt))),
    getDb().select({ deletionRequestedAt: schema.user.deletionRequestedAt }).from(schema.user).where(eq(schema.user.id, ctx.user.id)),
  ])
  const deletionAt = me[0]?.deletionRequestedAt
  const plan = effectivePlan(ctx.workspace)
  const u = ctx.user as typeof ctx.user & { role?: string }
  const [flags, status] = await Promise.all([
    flagsFor({ userId: u.id, planId: ctx.workspace.planId, unlimited: ctx.workspace.unlimited }),
    publicStatus(),
  ])
  const engine = engineFeatures()
  return {
    user: { id: u.id, name: u.name, email: u.email, image: u.image ?? null, role: u.role ?? 'user', emailVerified: u.emailVerified },
    workspace: { id: ctx.workspace.id, name: ctx.workspace.name, planId: ctx.workspace.planId, subscriptionStatus: ctx.workspace.subscriptionStatus, role: ctx.role, unlimited: ctx.workspace.unlimited },
    workspaces: workspaces.map((w) => ({ id: w.id, name: w.name, planId: w.planId })),
    balance: { ...balance, allowance: plan.creditsPerMonth ?? 0 },
    unread: unread[0]?.n ?? 0,
    previewEngine: getVoiceEngine().isMock,
    /** Product features the configured voice engine supports; the rest are hidden. */
    features: { ...engine, ...Object.fromEntries(Object.entries(flags).map(([k, on]) => [k, on && (engine as Record<string, unknown>)[k] !== false])) } as typeof engine & Record<keyof typeof flags, boolean>,
    /** Plan values the browser needs (admin edits included). */
    plan: { mixerSources: plan.mixerSources, customVoices: plan.customVoices },
    /** An Owner's workspace: every feature, no quotas, no payment. */
    allFeatures: ctx.workspace.unlimited,
    /** Staff can open the admin console. */
    isStaff: isStaff(u.role),
    announcement: status.announcement,
    /** Maintenance mode is on; staff still get in. */
    maintenance: status.maintenance && !isStaff(u.role) ? status.maintenance : null,
    /** Cloning is off because the consent check isn't production-grade yet (not because of the engine). */
    cloningPaused: !cloningAllowed(),
    /** When the account will be purged, if deletion was requested (ISO date). */
    deletionPurgeAt: deletionAt ? new Date(deletionAt.getTime() + DELETION_GRACE_DAYS * 86_400_000).toISOString().slice(0, 10) : null,
  }
})
export type AppContext = Awaited<ReturnType<typeof getAppContext>>
