import 'server-only'
import Stripe from 'stripe'
import { and, eq, lte, ne, or } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import { env } from '@/server/env'
import { newId } from '@/server/ids'
import { addCredits, resetPlanCredits } from '@/server/credits'
import { audit } from '@/server/audit'
import { refreshPlans } from '@/server/plans'
import { sendEmail } from '@/server/email'
import { getMessages, fmt } from '@/i18n'
import {
  getPlan, parsePriceLookupKey, priceLookupKey, TOP_UPS,
  type BillingPeriod, type PaidPlanId, type TopUp,
} from '@/config/plans'

/**
 * Billing on Stripe. Locally STRIPE_API_BASE points at stripe-mock, which answers every call with
 * fixture objects, so the flows and the webhook handler are exercised without an account.
 *
 * Plans are Stripe Prices found by lookup key (mimix_<plan>_<period>_<currency>), created once by
 * `npm run stripe:setup`. Stripe owns money: proration on upgrades, Smart Retries on failed
 * payments, invoices and (when STRIPE_AUTOMATIC_TAX=1) tax. Mimix owns credits, driven by webhooks.
 */
let client: Stripe | undefined
export function getStripe(): Stripe {
  if (client) return client
  const e = env()
  const base = e.STRIPE_API_BASE ? new URL(e.STRIPE_API_BASE) : null
  client = new Stripe(e.STRIPE_SECRET_KEY, {
    appInfo: { name: 'Mimix' },
    maxNetworkRetries: 2,
    ...(base ? { host: base.hostname, port: Number(base.port || (base.protocol === 'https:' ? 443 : 80)), protocol: base.protocol.replace(':', '') as 'http' | 'https' } : {}),
  })
  return client
}

export class BillingError extends Error {
  constructor(public code: 'NO_SUBSCRIPTION' | 'PLAN_UNAVAILABLE' | 'FREE_PLAN_TOP_UP' | 'SAME_PLAN', message: string) { super(message); this.name = 'BillingError' }
}

async function getWorkspace(workspaceId: string) {
  const [w] = await getDb().select().from(schema.workspace).where(eq(schema.workspace.id, workspaceId))
  if (!w) throw new Error('Workspace not found')
  return w
}

/** The Stripe customer for a workspace, created on first need. */
export async function ensureCustomer(workspaceId: string, owner: { email: string; name: string }): Promise<string> {
  const w = await getWorkspace(workspaceId)
  if (w.stripeCustomerId) return w.stripeCustomerId
  const c = await getStripe().customers.create({ email: owner.email, name: owner.name, metadata: { workspaceId } }, { idempotencyKey: `customer-${workspaceId}` })
  await getDb().update(schema.workspace).set({ stripeCustomerId: c.id }).where(eq(schema.workspace.id, workspaceId))
  return c.id
}

export async function priceIdFor(plan: PaidPlanId, period: BillingPeriod): Promise<string> {
  const key = priceLookupKey(plan, period)
  const list = await getStripe().prices.list({ lookup_keys: [key], active: true, limit: 1 })
  const price = list.data[0]
  if (!price) throw new BillingError('PLAN_UNAVAILABLE', `No active Stripe price with lookup key ${key}. Run npm run stripe:setup.`)
  return price.id
}

/** Starts Checkout for a new subscription. Existing subscribers change plan with changePlan. */
export async function createSubscriptionCheckout(opts: { workspaceId: string; plan: PaidPlanId; period: BillingPeriod; owner: { email: string; name: string } }): Promise<string> {
  const e = env()
  const customer = await ensureCustomer(opts.workspaceId, opts.owner)
  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer,
    line_items: [{ price: await priceIdFor(opts.plan, opts.period), quantity: 1 }],
    allow_promotion_codes: true,
    automatic_tax: { enabled: e.STRIPE_AUTOMATIC_TAX },
    ...(e.STRIPE_AUTOMATIC_TAX ? { customer_update: { address: 'auto' as const, name: 'auto' as const }, tax_id_collection: { enabled: true } } : {}),
    client_reference_id: opts.workspaceId,
    subscription_data: { metadata: { workspaceId: opts.workspaceId } },
    metadata: { workspaceId: opts.workspaceId, kind: 'subscription' },
    success_url: `${e.APP_URL}/app/settings/billing?checkout=success`,
    cancel_url: `${e.APP_URL}/app/settings/billing?checkout=canceled`,
  })
  return session.url!
}

export async function createTopUpCheckout(opts: { workspaceId: string; topUp: TopUp['id']; owner: { email: string; name: string } }): Promise<string> {
  const e = env()
  const w = await getWorkspace(opts.workspaceId)
  if (w.planId === 'free') throw new BillingError('FREE_PLAN_TOP_UP', 'Top-ups are available on paid plans.')
  const pack = TOP_UPS.find((t) => t.id === opts.topUp)
  if (!pack) throw new BillingError('PLAN_UNAVAILABLE', 'Unknown top-up')
  const customer = await ensureCustomer(opts.workspaceId, opts.owner)
  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    customer,
    line_items: [{
      quantity: 1,
      price_data: { currency: w.currency.toLowerCase(), unit_amount: pack.prices.USD, product_data: { name: `${new Intl.NumberFormat('en-US').format(pack.credits)} Mimix credits` } },
    }],
    automatic_tax: { enabled: e.STRIPE_AUTOMATIC_TAX },
    invoice_creation: { enabled: true },
    client_reference_id: opts.workspaceId,
    metadata: { workspaceId: opts.workspaceId, kind: 'top_up', credits: String(pack.credits), topUp: pack.id },
    success_url: `${e.APP_URL}/app/settings/billing?topup=success`,
    cancel_url: `${e.APP_URL}/app/settings/billing?topup=canceled`,
  })
  return session.url!
}

export async function createPortalSession(workspaceId: string): Promise<string> {
  const w = await getWorkspace(workspaceId)
  if (!w.stripeCustomerId) throw new BillingError('NO_SUBSCRIPTION', 'There is no billing account yet.')
  const s = await getStripe().billingPortal.sessions.create({ customer: w.stripeCustomerId, return_url: `${env().APP_URL}/app/settings/billing` })
  return s.url
}

const RANK: Record<string, number> = { free: 0, maker: 1, pro: 2, production: 3, team: 4, enterprise: 5 }

/**
 * Changes an existing subscription. Upgrades are prorated now and the extra monthly credits are
 * added at once; downgrades are not prorated and keep this cycle's credits until the next reset.
 */
export async function changePlan(opts: { workspaceId: string; plan: PaidPlanId; period: BillingPeriod; actorId: string }): Promise<void> {
  const w = await getWorkspace(opts.workspaceId)
  if (!w.stripeSubscriptionId) throw new BillingError('NO_SUBSCRIPTION', 'Start a subscription first.')
  if (w.planId === opts.plan && w.billingPeriod === opts.period) throw new BillingError('SAME_PLAN', 'You are already on this plan.')
  const stripe = getStripe()
  const sub = await stripe.subscriptions.retrieve(w.stripeSubscriptionId)
  const item = sub.items.data[0]
  if (!item) throw new BillingError('NO_SUBSCRIPTION', 'Subscription has no items.')
  const upgrade = RANK[opts.plan]! > RANK[w.planId]!
  await stripe.subscriptions.update(sub.id, {
    items: [{ id: item.id, price: await priceIdFor(opts.plan, opts.period) }],
    proration_behavior: upgrade ? 'always_invoice' : 'none',
    payment_behavior: 'pending_if_incomplete',
    metadata: { workspaceId: opts.workspaceId },
  })
  await applyPlan(opts.workspaceId, opts.plan, opts.period, { upgradeTopOff: upgrade })
  await audit({ actorId: opts.actorId, action: 'billing.plan_changed', targetType: 'workspace', targetId: opts.workspaceId, before: { plan: w.planId, period: w.billingPeriod }, after: { plan: opts.plan, period: opts.period } })
}

/** Cancels at the end of the paid period (the portal offers the same). */
export async function cancelAtPeriodEnd(workspaceId: string, cancel: boolean): Promise<void> {
  const w = await getWorkspace(workspaceId)
  if (!w.stripeSubscriptionId) throw new BillingError('NO_SUBSCRIPTION', 'There is no subscription.')
  await getStripe().subscriptions.update(w.stripeSubscriptionId, { cancel_at_period_end: cancel })
  await getDb().update(schema.workspace).set({ cancelAtPeriodEnd: cancel }).where(eq(schema.workspace.id, workspaceId))
}

async function applyPlan(workspaceId: string, plan: PaidPlanId | 'free', period: BillingPeriod, opts: { upgradeTopOff?: boolean; fresh?: boolean } = {}) {
  const w = await getWorkspace(workspaceId)
  const next = getPlan(plan)
  const prev = getPlan(w.planId)
  await getDb().update(schema.workspace).set({ planId: plan, billingPeriod: period, seats: next.seats ?? w.seats }).where(eq(schema.workspace.id, workspaceId))
  if (opts.fresh) {
    await resetPlanCredits({ workspaceId, allowance: next.creditsPerMonth ?? 0, reason: 'plan_grant' })
  } else if (opts.upgradeTopOff) {
    const extra = (next.creditsPerMonth ?? 0) - (prev.creditsPerMonth ?? 0)
    if (extra > 0) await addCredits({ workspaceId, amount: extra, reason: 'admin_adjustment', note: `upgrade ${prev.id}→${next.id}` })
  }
}

/* ------------------------------------------------------------------ webhooks */

function subscriptionIdOf(invoice: Stripe.Invoice): string | null {
  const legacy = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription
  const nested = invoice.parent?.subscription_details?.subscription
  const v = nested ?? legacy
  return typeof v === 'string' ? v : v?.id ?? null
}

async function workspaceForCustomer(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): Promise<string | null> {
  const id = typeof customer === 'string' ? customer : customer?.id
  if (!id) return null
  const [w] = await getDb().select({ id: schema.workspace.id }).from(schema.workspace).where(eq(schema.workspace.stripeCustomerId, id))
  return w?.id ?? null
}

async function emailOwners(workspaceId: string, kind: 'paymentFailed', values: Record<string, string>) {
  const owners = await getDb().select({ email: schema.user.email, name: schema.user.name, ws: schema.workspace.name })
    .from(schema.workspaceMember)
    .innerJoin(schema.user, eq(schema.user.id, schema.workspaceMember.userId))
    .innerJoin(schema.workspace, eq(schema.workspace.id, schema.workspaceMember.workspaceId))
    .where(and(eq(schema.workspaceMember.workspaceId, workspaceId), eq(schema.workspaceMember.role, 'owner')))
  const m = getMessages('en').emails
  for (const o of owners) {
    const v = { name: o.name, workspace: o.ws, ...values }
    await sendEmail({ to: o.email, subject: fmt(m[kind].subject, v), text: `${fmt(m[kind].body, v)}\n\n${m.footer}`, tag: kind })
  }
}

async function upsertInvoice(workspaceId: string, inv: Stripe.Invoice) {
  const values = {
    workspaceId, stripeInvoiceId: inv.id!, number: inv.number, amountDue: inv.amount_due, amountPaid: inv.amount_paid,
    tax: (inv.total_taxes ?? []).reduce((s, t) => s + t.amount, 0), currency: inv.currency.toUpperCase(), status: inv.status ?? 'open',
    hostedUrl: inv.hosted_invoice_url ?? null, pdfUrl: inv.invoice_pdf ?? null,
    periodStart: inv.period_start ? new Date(inv.period_start * 1000) : null, periodEnd: inv.period_end ? new Date(inv.period_end * 1000) : null,
  }
  await getDb().insert(schema.invoice).values({ id: newId('inv'), ...values })
    .onConflictDoUpdate({ target: schema.invoice.stripeInvoiceId, set: values })
}

/** Verifies the signature and parses a webhook. Throws on a bad signature. */
export function parseWebhook(payload: string, signature: string | null): Stripe.Event {
  if (!signature) throw new Error('Missing Stripe-Signature')
  return getStripe().webhooks.constructEvent(payload, signature, env().STRIPE_WEBHOOK_SECRET)
}

/** Applies one Stripe event, at most once (stripe_event table). Returns false for a duplicate. */
export async function handleStripeEvent(event: Stripe.Event): Promise<boolean> {
  const inserted = await getDb().insert(schema.stripeEvent).values({ id: event.id, type: event.type }).onConflictDoNothing().returning({ id: schema.stripeEvent.id })
  if (inserted.length === 0) return false
  await refreshPlans()
  try {
    await dispatch(event)
  } catch (err) {
    // Let Stripe retry: forget the event so the retry is processed.
    await getDb().delete(schema.stripeEvent).where(eq(schema.stripeEvent.id, event.id))
    throw err
  }
  return true
}

async function dispatch(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object
      const workspaceId = s.metadata?.workspaceId ?? s.client_reference_id
      if (!workspaceId) return
      if (s.metadata?.kind === 'top_up' && s.payment_status === 'paid') {
        await addCredits({ workspaceId, amount: Number(s.metadata.credits), reason: 'top_up', refId: s.id, note: s.metadata.topUp })
      }
      if (s.mode === 'subscription' && s.subscription) {
        const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription.id
        await getDb().update(schema.workspace).set({ stripeSubscriptionId: subId, stripeCustomerId: typeof s.customer === 'string' ? s.customer : s.customer?.id }).where(eq(schema.workspace.id, workspaceId))
      }
      return
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object
      const workspaceId = sub.metadata?.workspaceId ?? await workspaceForCustomer(sub.customer)
      if (!workspaceId) return
      const parsed = parsePriceLookupKey(sub.items.data[0]?.price.lookup_key)
      const w = await getWorkspace(workspaceId)
      await getDb().update(schema.workspace).set({
        stripeSubscriptionId: sub.id, subscriptionStatus: sub.status === 'paused' ? 'past_due' : sub.status as typeof schema.workspace.$inferSelect.subscriptionStatus,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      }).where(eq(schema.workspace.id, workspaceId))
      if (!parsed) return
      const isNew = event.type === 'customer.subscription.created' || w.planId === 'free'
      if (isNew && (sub.status === 'active' || sub.status === 'trialing')) await applyPlan(workspaceId, parsed.plan, parsed.period, { fresh: true })
      else if (parsed.plan !== w.planId || parsed.period !== w.billingPeriod) await applyPlan(workspaceId, parsed.plan, parsed.period, { upgradeTopOff: RANK[parsed.plan]! > RANK[w.planId]! })
      return
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const workspaceId = sub.metadata?.workspaceId ?? await workspaceForCustomer(sub.customer)
      if (!workspaceId) return
      await getDb().update(schema.workspace).set({ stripeSubscriptionId: null, subscriptionStatus: 'canceled', cancelAtPeriodEnd: false }).where(eq(schema.workspace.id, workspaceId))
      await applyPlan(workspaceId, 'free', 'monthly', { fresh: true })
      await audit({ actorRole: 'system', action: 'billing.subscription_ended', targetType: 'workspace', targetId: workspaceId })
      return
    }
    case 'invoice.paid': {
      const inv = event.data.object
      const workspaceId = await workspaceForCustomer(inv.customer)
      if (!workspaceId) return
      await upsertInvoice(workspaceId, inv)
      // A renewal of a monthly plan starts a new credit cycle. Annual plans reset monthly via resetDueCycles.
      if (inv.billing_reason === 'subscription_cycle') {
        const w = await getWorkspace(workspaceId)
        if (w.billingPeriod === 'monthly') await resetPlanCredits({ workspaceId, allowance: getPlan(w.planId).creditsPerMonth ?? 0, reason: 'monthly_reset' })
      }
      if (subscriptionIdOf(inv)) await getDb().update(schema.workspace).set({ subscriptionStatus: 'active' }).where(eq(schema.workspace.id, workspaceId))
      return
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object
      const workspaceId = await workspaceForCustomer(inv.customer)
      if (!workspaceId) return
      await upsertInvoice(workspaceId, inv)
      await getDb().update(schema.workspace).set({ subscriptionStatus: 'past_due' }).where(eq(schema.workspace.id, workspaceId))
      await emailOwners(workspaceId, 'paymentFailed', { url: `${env().APP_URL}/app/settings/billing` })
      return
    }
    case 'invoice.finalized':
    case 'invoice.voided':
    case 'invoice.marked_uncollectible': {
      const inv = event.data.object
      const workspaceId = await workspaceForCustomer(inv.customer)
      if (workspaceId) await upsertInvoice(workspaceId, inv)
      return
    }
    default:
      return
  }
}

/**
 * Monthly credit reset for workspaces whose cycle has ended and that are not reset by a Stripe
 * renewal: Free plans and annual plans (billed yearly, credited monthly). Run hourly by the worker.
 */
export async function resetDueCycles(now = new Date()): Promise<number> {
  const db = getDb()
  // Plans given free by staff end on their last day and return to Free.
  const ended = await db.update(schema.workspace).set({ planId: 'free', comped: false, compUntil: null })
    .where(and(eq(schema.workspace.comped, true), lte(schema.workspace.compUntil, now))).returning({ id: schema.workspace.id, planId: schema.workspace.planId })
  for (const w of ended) {
    await resetPlanCredits({ workspaceId: w.id, allowance: getPlan('free').creditsPerMonth ?? 0, reason: 'plan_grant' })
    await audit({ actorId: null, actorRole: 'system', action: 'workspace.comp_ended', targetType: 'workspace', targetId: w.id, after: { planId: 'free' } })
  }
  // Monthly resets that no Stripe renewal does: Free, annual, and plans given without Stripe.
  const due = await db.select({ id: schema.workspace.id, planId: schema.workspace.planId })
    .from(schema.workspace)
    .where(and(lte(schema.workspace.cycleEndsAt, now), or(eq(schema.workspace.planId, 'free'), ne(schema.workspace.billingPeriod, 'monthly'), eq(schema.workspace.comped, true))))
  for (const w of due) await resetPlanCredits({ workspaceId: w.id, allowance: getPlan(w.planId).creditsPerMonth ?? 0, reason: 'monthly_reset' })
  return due.length
}
