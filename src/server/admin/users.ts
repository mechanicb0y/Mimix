import 'server-only'
import { and, count, desc, eq, ilike, inArray, ne, or, sql, type SQL } from 'drizzle-orm'
import { z } from '@/lib/zod'
import { getDb, schema } from '@/server/db'
import { ROLES, USER_STATUSES, PLAN_IDS, type Role } from '@/server/db/schema'
import { addCredits, getBalance, resetPlanCredits } from '@/server/credits'
import { audit } from '@/server/audit'
import { UserError } from '@/server/api/errors'
import { getPlan } from '@/config/plans'
import { isStaff, outranks } from '@/config/admin'
import type { AdminActor } from '@/server/admin/guard'
import { getMessages } from '@/i18n'

const t = () => getMessages('en').errors.admin
export const PAGE_SIZE = 50

/* ------------------------------------------------------------------ queries */

export const userSearchSchema = z.object({
  q: z.string().trim().max(200).optional().default(''),
  role: z.enum(ROLES).optional().catch(undefined),
  status: z.enum(USER_STATUSES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).optional().catch(1).default(1),
})

export async function searchUsers(input: z.input<typeof userSearchSchema>) {
  const f = userSearchSchema.parse(input)
  const where: SQL[] = []
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`
    where.push(or(ilike(schema.user.email, like), ilike(schema.user.name, like), eq(schema.user.id, f.q))!)
  }
  if (f.role) where.push(eq(schema.user.role, f.role))
  if (f.status) where.push(eq(schema.user.status, f.status))
  const cond = where.length ? and(...where) : undefined
  const db = getDb()
  const [rows, total] = await Promise.all([
    db.select({
      id: schema.user.id, name: schema.user.name, email: schema.user.email, role: schema.user.role, status: schema.user.status,
      emailVerified: schema.user.emailVerified, twoFactorEnabled: schema.user.twoFactorEnabled, createdAt: schema.user.createdAt,
      planId: schema.workspace.planId,
    }).from(schema.user).leftJoin(schema.workspace, eq(schema.workspace.id, schema.user.defaultWorkspaceId))
      .where(cond).orderBy(desc(schema.user.createdAt)).limit(PAGE_SIZE).offset((f.page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(schema.user).where(cond),
  ])
  return { rows, total: total[0]?.n ?? 0, page: f.page, filters: f }
}

/** Everything the user detail page shows. */
export async function userDetail(userId: string) {
  const db = getDb()
  const [u] = await db.select().from(schema.user).where(eq(schema.user.id, userId))
  if (!u) return null
  const memberships = await db.select({ role: schema.workspaceMember.role, workspace: schema.workspace })
    .from(schema.workspaceMember).innerJoin(schema.workspace, eq(schema.workspace.id, schema.workspaceMember.workspaceId))
    .where(eq(schema.workspaceMember.userId, userId))
  const wsIds = memberships.map((m) => m.workspace.id)
  const [workspaces, voices, usage, sessions, ledger, reports] = await Promise.all([
    Promise.all(memberships.map(async (m) => ({ ...m, balance: await getBalance(m.workspace.id), members: (await db.select({ n: count() }).from(schema.workspaceMember).where(eq(schema.workspaceMember.workspaceId, m.workspace.id)))[0]?.n ?? 0 }))),
    db.select({ id: schema.voice.id, name: schema.voice.name, kind: schema.voice.kind, status: schema.voice.status, publishStatus: schema.voice.publishStatus, createdAt: schema.voice.createdAt })
      .from(schema.voice).where(and(eq(schema.voice.ownerUserId, userId), ne(schema.voice.status, 'deleted'))).orderBy(desc(schema.voice.createdAt)).limit(50),
    wsIds.length
      ? db.select({ module: schema.generation.module, n: count(), credits: sql<number>`coalesce(sum(${schema.generation.credits}), 0)::int`, units: sql<number>`coalesce(sum(${schema.generation.units}), 0)::int` })
        .from(schema.generation).where(and(eq(schema.generation.userId, userId), sql`${schema.generation.createdAt} > now() - interval '30 days'`)).groupBy(schema.generation.module)
      : Promise.resolve([]),
    db.select({ id: schema.session.id, createdAt: schema.session.createdAt, updatedAt: schema.session.updatedAt, ipAddress: schema.session.ipAddress, userAgent: schema.session.userAgent, expiresAt: schema.session.expiresAt })
      .from(schema.session).where(eq(schema.session.userId, userId)).orderBy(desc(schema.session.updatedAt)).limit(20),
    wsIds.length
      ? db.select().from(schema.creditLedger).where(and(inArray(schema.creditLedger.workspaceId, wsIds), eq(schema.creditLedger.reason, 'admin_adjustment'))).orderBy(desc(schema.creditLedger.createdAt)).limit(20)
      : Promise.resolve([]),
    db.select({ n: count() }).from(schema.abuseReport).where(and(eq(schema.abuseReport.targetType, 'user'), eq(schema.abuseReport.targetId, userId))),
  ])
  return { user: u, workspaces, voices, usage, sessions, adjustments: ledger, reports: reports[0]?.n ?? 0 }
}

/** The read-only "view as user" snapshot: what their app home would show, without signing in as them. */
export async function viewAsSnapshot(userId: string, actor: AdminActor) {
  const d = await userDetail(userId)
  if (!d) return null
  const wsIds = d.workspaces.map((w) => w.workspace.id)
  const generations = wsIds.length
    ? await getDb().select({ id: schema.generation.id, module: schema.generation.module, status: schema.generation.status, credits: schema.generation.credits, units: schema.generation.units, createdAt: schema.generation.createdAt, workspaceId: schema.generation.workspaceId })
      .from(schema.generation).where(inArray(schema.generation.workspaceId, wsIds)).orderBy(desc(schema.generation.createdAt)).limit(25)
    : []
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'admin.view_as', targetType: 'user', targetId: userId, ipAddress: actor.ip })
  return { ...d, generations }
}

/* ------------------------------------------------------------------ guards */

async function loadTarget(userId: string) {
  const [u] = await getDb().select().from(schema.user).where(eq(schema.user.id, userId))
  if (!u) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  return u
}

/**
 * Staff act only on accounts with a lower role than their own. Owners are the exception: an Owner
 * can act on another Owner (and only an Owner can). Nobody acts on their own account here.
 */
function protectTarget(actor: AdminActor, target: { id: string; role: string }) {
  if (target.id === actor.id) throw new UserError('not_yourself', t().notYourself, 409)
  if (target.role === 'owner' && actor.role !== 'owner') throw new UserError('owner_only', t().ownerOnly, 403)
  if (!outranks(actor.role, target.role)) throw new UserError('lower_role_only', t().lowerRoleOnly, 403)
}

async function activeOwners(): Promise<number> {
  const [r] = await getDb().select({ n: count() }).from(schema.user).where(and(eq(schema.user.role, 'owner'), eq(schema.user.status, 'active')))
  return r?.n ?? 0
}

const reason = z.string().trim().min(5, 'reason').max(500, 'reason')

/* ------------------------------------------------------------------ actions */

export const adjustCreditsSchema = z.object({
  workspaceId: z.string().min(1),
  amount: z.number().int().refine((n) => n !== 0 && Math.abs(n) <= 10_000_000, 'amount'),
  reason,
})

/** Adds or removes plan credits on one of the user's workspaces, with a required reason. */
export async function adjustCredits(actor: AdminActor, userId: string, input: z.infer<typeof adjustCreditsSchema>) {
  protectTarget(actor, await loadTarget(userId))
  const [m] = await getDb().select().from(schema.workspaceMember).where(and(eq(schema.workspaceMember.userId, userId), eq(schema.workspaceMember.workspaceId, input.workspaceId)))
  if (!m) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  const before = await getBalance(input.workspaceId)
  const after = await addCredits({ workspaceId: input.workspaceId, amount: input.amount, reason: 'admin_adjustment', actorId: actor.id, note: input.reason })
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'admin.credits_adjusted', targetType: 'workspace', targetId: input.workspaceId, before: { plan: before.plan, topUp: before.topUp }, after: { plan: after.plan, topUp: after.topUp, amount: input.amount, userId }, reason: input.reason, ipAddress: actor.ip })
  return after
}

export const changePlanSchema = z.object({
  workspaceId: z.string().min(1), planId: z.enum(PLAN_IDS), reason,
  /** Optional last day (YYYY-MM-DD) of a plan given free; the workspace returns to Free after it. */
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('').transform(() => undefined)),
})

/**
 * Gives a workspace a plan free, without Stripe (testers, partners, corrections), and grants that
 * plan's monthly credits now. With `until`, it returns to Free after that day. Workspaces with a
 * live Stripe subscription change plan through Stripe instead.
 */
export async function changeWorkspacePlan(actor: AdminActor, userId: string, input: z.infer<typeof changePlanSchema>) {
  protectTarget(actor, await loadTarget(userId))
  const db = getDb()
  const [m] = await db.select().from(schema.workspaceMember).where(and(eq(schema.workspaceMember.userId, userId), eq(schema.workspaceMember.workspaceId, input.workspaceId)))
  if (!m) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  const [w] = await db.select().from(schema.workspace).where(eq(schema.workspace.id, input.workspaceId))
  if (!w) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  if (w.stripeSubscriptionId && ['active', 'trialing', 'past_due', 'unpaid'].includes(w.subscriptionStatus)) throw new UserError('stripe_managed', t().noSubscriptionPlan, 409)
  const plan = getPlan(input.planId)
  const compUntil = input.until && input.planId !== 'free' ? new Date(`${input.until}T23:59:59Z`) : null
  if (compUntil && compUntil.getTime() < Date.now()) throw new UserError('validation', t().untilPast, 422, { until: t().untilPast })
  await db.transaction(async (tx) => {
    await tx.update(schema.workspace).set({ planId: input.planId, comped: input.planId !== 'free', compUntil, seats: Math.max(w.seats, plan.seats ?? w.seats) }).where(eq(schema.workspace.id, w.id))
    await resetPlanCredits({ workspaceId: w.id, allowance: plan.creditsPerMonth ?? 0, reason: 'plan_grant', tx })
  })
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'admin.plan_changed', targetType: 'workspace', targetId: w.id, before: { planId: w.planId }, after: { planId: input.planId, comped: input.planId !== 'free', until: input.until ?? null }, reason: input.reason, ipAddress: actor.ip })
}

export const setStatusSchema = z.object({ status: z.enum(USER_STATUSES), reason })

/** Suspends, bans or restores an account. Suspended and banned accounts are signed out everywhere and their API keys stop working. */
export async function setUserStatus(actor: AdminActor, userId: string, input: z.infer<typeof setStatusSchema>) {
  const target = await loadTarget(userId)
  protectTarget(actor, target)
  if (target.role === 'owner' && input.status !== 'active' && (await activeOwners()) <= 1) throw new UserError('last_owner', t().lastOwner, 409)
  if (target.status === input.status) return
  const db = getDb()
  await db.update(schema.user).set({ status: input.status }).where(eq(schema.user.id, userId))
  if (input.status !== 'active') await db.delete(schema.session).where(eq(schema.session.userId, userId))
  const action = input.status === 'active' ? 'admin.user_restored' : input.status === 'banned' ? 'admin.user_banned' : 'admin.user_suspended'
  await audit({ actorId: actor.id, actorRole: actor.role, action, targetType: 'user', targetId: userId, before: { status: target.status }, after: { status: input.status }, reason: input.reason, ipAddress: actor.ip })
}

export const resetTwoFactorSchema = z.object({ reason })

/** Turns off two-factor for a user who lost their device, and signs them out everywhere. */
export async function resetTwoFactor(actor: AdminActor, userId: string, input: z.infer<typeof resetTwoFactorSchema>) {
  const target = await loadTarget(userId)
  protectTarget(actor, target)
  // A staff account's second factor guards the console, so only an Owner may reset it.
  if (isStaff(target.role) && actor.role !== 'owner') throw new UserError('owner_for_2fa', t().ownerFor2fa, 403)
  const db = getDb()
  await db.delete(schema.twoFactor).where(eq(schema.twoFactor.userId, userId))
  await db.update(schema.user).set({ twoFactorEnabled: false }).where(eq(schema.user.id, userId))
  await db.delete(schema.session).where(eq(schema.session.userId, userId))
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'admin.two_factor_reset', targetType: 'user', targetId: userId, before: { twoFactorEnabled: target.twoFactorEnabled }, after: { twoFactorEnabled: false }, reason: input.reason, ipAddress: actor.ip })
}

export const setRoleSchema = z.object({ role: z.enum(ROLES), reason })

/**
 * Promotes or demotes. Only Owners can (manageRoles); an Owner can only be demoted by another
 * Owner, and the last active Owner can't be demoted. A changed role signs the account out, so the
 * next sign-in sends the new-admin-sign-in alert and runs the 2FA requirement.
 */
export async function setUserRole(actor: AdminActor, userId: string, input: z.infer<typeof setRoleSchema>) {
  const target = await loadTarget(userId)
  protectTarget(actor, target)
  if (target.role === input.role) return
  if (target.role === 'owner' && (await activeOwners()) <= 1) throw new UserError('last_owner', t().lastOwner, 409)
  const db = getDb()
  await db.transaction(async (tx) => {
    await tx.update(schema.user).set({ role: input.role as Role }).where(eq(schema.user.id, userId))
    // Owners have no quotas on the workspaces they own; that goes with the role.
    const owned = await tx.select({ id: schema.workspaceMember.workspaceId }).from(schema.workspaceMember)
      .where(and(eq(schema.workspaceMember.userId, userId), eq(schema.workspaceMember.role, 'owner')))
    if (owned.length) await tx.update(schema.workspace).set({ unlimited: input.role === 'owner' }).where(inArray(schema.workspace.id, owned.map((o) => o.id)))
    await tx.delete(schema.session).where(eq(schema.session.userId, userId))
  })
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'admin.role_changed', targetType: 'user', targetId: userId, before: { role: target.role }, after: { role: input.role }, reason: input.reason, ipAddress: actor.ip })
}
