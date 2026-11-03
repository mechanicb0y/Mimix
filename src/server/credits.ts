import 'server-only'
import { and, eq, sql } from 'drizzle-orm'
import { getDb, schema, type Tx } from '@/server/db'
import { newId } from '@/server/ids'

/**
 * Credits. Each workspace has two buckets: plan credits (reset every month to the plan's allowance)
 * and top-up credits (bought separately, never reset). Usage spends plan credits first.
 * Every change writes one append-only ledger row; the balances on `workspace` are a cache of it.
 * Charges are made inside a transaction that locks the workspace row, so two requests can never
 * spend the same credits.
 */

export class InsufficientCreditsError extends Error {
  constructor(public needed: number, public available: number) {
    super(`This needs ${needed} credits and ${available} are left.`)
    this.name = 'InsufficientCreditsError'
  }
}

export interface Balance { plan: number; topUp: number; total: number; unlimited: boolean }

async function lockWorkspace(tx: Tx, workspaceId: string) {
  const [w] = await tx.select({
    plan: schema.workspace.creditBalance, topUp: schema.workspace.topUpBalance, unlimited: schema.workspace.unlimited,
  }).from(schema.workspace).where(eq(schema.workspace.id, workspaceId)).for('update')
  if (!w) throw new Error('Workspace not found')
  return w
}

export async function getBalance(workspaceId: string): Promise<Balance> {
  const [w] = await getDb().select({ plan: schema.workspace.creditBalance, topUp: schema.workspace.topUpBalance, unlimited: schema.workspace.unlimited })
    .from(schema.workspace).where(eq(schema.workspace.id, workspaceId))
  if (!w) throw new Error('Workspace not found')
  return { plan: w.plan, topUp: w.topUp, total: w.plan + w.topUp, unlimited: w.unlimited }
}

/** Spends credits for one operation. `refId` (a generation id) makes the charge idempotent. */
export async function chargeCredits(opts: { workspaceId: string; credits: number; module: string; refId: string; actorId?: string | null; tx?: Tx }): Promise<Balance> {
  const run = async (tx: Tx): Promise<Balance> => {
    const w = await lockWorkspace(tx, opts.workspaceId)
    const already = await tx.select({ id: schema.creditLedger.id }).from(schema.creditLedger)
      .where(and(eq(schema.creditLedger.reason, 'usage'), eq(schema.creditLedger.refId, opts.refId)))
    if (already.length) return { plan: w.plan, topUp: w.topUp, total: w.plan + w.topUp, unlimited: w.unlimited }
    if (opts.credits <= 0 || w.unlimited) {
      // Usage is still metered for unlimited (Owner) workspaces, without moving the balance.
      await tx.insert(schema.creditLedger).values({ id: newId('led'), workspaceId: opts.workspaceId, delta: 0, reason: 'usage', module: opts.module, refId: opts.refId, actorId: opts.actorId ?? null, note: w.unlimited ? `unlimited:${opts.credits}` : null, balanceAfter: w.plan + w.topUp })
      return { plan: w.plan, topUp: w.topUp, total: w.plan + w.topUp, unlimited: w.unlimited }
    }
    const total = w.plan + w.topUp
    if (total < opts.credits) throw new InsufficientCreditsError(opts.credits, total)
    const fromPlan = Math.min(w.plan, opts.credits)
    const fromTopUp = opts.credits - fromPlan
    const plan = w.plan - fromPlan
    const topUp = w.topUp - fromTopUp
    await tx.update(schema.workspace).set({ creditBalance: plan, topUpBalance: topUp }).where(eq(schema.workspace.id, opts.workspaceId))
    await tx.insert(schema.creditLedger).values({
      id: newId('led'), workspaceId: opts.workspaceId, delta: -opts.credits, bucket: fromTopUp > 0 && fromPlan === 0 ? 'top_up' : 'plan',
      reason: 'usage', module: opts.module, refId: opts.refId, actorId: opts.actorId ?? null,
      note: fromTopUp > 0 && fromPlan > 0 ? `plan:${fromPlan},top_up:${fromTopUp}` : null, balanceAfter: plan + topUp,
    })
    return { plan, topUp, total: plan + topUp, unlimited: false }
  }
  return opts.tx ? run(opts.tx) : getDb().transaction(run)
}

/** Gives back the credits of a failed operation (once per refId). Refunds go to the plan bucket. */
export async function refundCredits(opts: { workspaceId: string; refId: string; actorId?: string | null }): Promise<void> {
  await getDb().transaction(async (tx) => {
    const w = await lockWorkspace(tx, opts.workspaceId)
    const [charge] = await tx.select().from(schema.creditLedger).where(and(eq(schema.creditLedger.reason, 'usage'), eq(schema.creditLedger.refId, opts.refId)))
    if (!charge || charge.delta === 0) return
    const [done] = await tx.select({ id: schema.creditLedger.id }).from(schema.creditLedger).where(and(eq(schema.creditLedger.reason, 'refund'), eq(schema.creditLedger.refId, opts.refId)))
    if (done) return
    const amount = -charge.delta
    const plan = w.plan + amount
    await tx.update(schema.workspace).set({ creditBalance: plan }).where(eq(schema.workspace.id, opts.workspaceId))
    await tx.insert(schema.creditLedger).values({ id: newId('led'), workspaceId: opts.workspaceId, delta: amount, reason: 'refund', module: charge.module, refId: opts.refId, actorId: opts.actorId ?? null, balanceAfter: plan + w.topUp })
  })
}

/** Sets the plan bucket to the plan's monthly allowance (new cycle, new plan, or first grant). */
export async function resetPlanCredits(opts: { workspaceId: string; allowance: number; reason: 'plan_grant' | 'monthly_reset'; tx?: Tx }): Promise<void> {
  const run = async (tx: Tx) => {
    const w = await lockWorkspace(tx, opts.workspaceId)
    const delta = opts.allowance - w.plan
    await tx.update(schema.workspace).set({ creditBalance: opts.allowance, cycleStartedAt: new Date(), cycleEndsAt: sql`now() + interval '1 month'` }).where(eq(schema.workspace.id, opts.workspaceId))
    await tx.insert(schema.creditLedger).values({ id: newId('led'), workspaceId: opts.workspaceId, delta, reason: opts.reason, balanceAfter: opts.allowance + w.topUp })
  }
  return opts.tx ? run(opts.tx) : getDb().transaction(run)
}

/** Adds top-up credits (after a paid checkout) or an admin adjustment (positive or negative, with a reason). */
export async function addCredits(opts: { workspaceId: string; amount: number; reason: 'top_up' | 'admin_adjustment'; refId?: string; actorId?: string | null; note?: string }): Promise<Balance> {
  return getDb().transaction(async (tx) => {
    const w = await lockWorkspace(tx, opts.workspaceId)
    if (opts.refId) {
      const [dup] = await tx.select({ id: schema.creditLedger.id }).from(schema.creditLedger).where(and(eq(schema.creditLedger.reason, opts.reason), eq(schema.creditLedger.refId, opts.refId)))
      if (dup) return { plan: w.plan, topUp: w.topUp, total: w.plan + w.topUp, unlimited: w.unlimited }
    }
    let plan = w.plan
    let topUp = w.topUp
    if (opts.reason === 'top_up') topUp += opts.amount
    else plan = Math.max(0, plan + opts.amount)
    await tx.update(schema.workspace).set({ creditBalance: plan, topUpBalance: topUp }).where(eq(schema.workspace.id, opts.workspaceId))
    await tx.insert(schema.creditLedger).values({ id: newId('led'), workspaceId: opts.workspaceId, delta: opts.reason === 'top_up' ? opts.amount : plan - w.plan, bucket: opts.reason === 'top_up' ? 'top_up' : 'plan', reason: opts.reason, refId: opts.refId ?? null, actorId: opts.actorId ?? null, note: opts.note ?? null, balanceAfter: plan + topUp })
    return { plan, topUp, total: plan + topUp, unlimited: w.unlimited }
  })
}
