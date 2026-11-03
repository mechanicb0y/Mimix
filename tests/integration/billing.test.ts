import { describe, expect, it, inject } from 'vitest'
import type Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { first } from '../support/first'
import { getDb, schema } from '@/server/db'
import { newId } from '@/server/ids'
import { getBalance } from '@/server/credits'
import { readOutbox } from '@/server/email'
import { getPlan } from '@/config/plans'
import {
  createPortalSession, createSubscriptionCheckout, createTopUpCheckout, getStripe, handleStripeEvent, parseWebhook, resetDueCycles,
} from '@/server/billing'
const credits = (id: 'free' | 'maker' | 'pro') => getPlan(id).creditsPerMonth!

const hasStripeMock = !!inject('stripeApiBase')

async function setup(plan: 'free' | 'maker' | 'pro' = 'free', period: 'monthly' | 'annual' = 'monthly') {
  const userId = newId('usr')
  const email = `${userId}@example.test`
  await getDb().insert(schema.user).values({ id: userId, name: 'Dana', email, emailVerified: true })
  const id = newId('ws')
  const customer = `cus_${id}`
  await getDb().insert(schema.workspace).values({ id, name: 'Dana’s workspace', planId: plan, billingPeriod: period, stripeCustomerId: customer, creditBalance: 10_000 })
  await getDb().insert(schema.workspaceMember).values({ workspaceId: id, userId, role: 'owner' })
  return { id, customer, email }
}

let seq = 0
function event<T extends Stripe.Event['type']>(type: T, object: Record<string, unknown>): Stripe.Event {
  return { id: `evt_${Date.now()}_${seq++}`, object: 'event', type, data: { object }, api_version: null, created: 0, livemode: false, pending_webhooks: 0, request: null } as unknown as Stripe.Event
}

function subscription(ws: { id: string; customer: string }, lookup: string, status = 'active') {
  return { id: `sub_${ws.id}`, object: 'subscription', customer: ws.customer, status, cancel_at_period_end: false, metadata: { workspaceId: ws.id }, items: { data: [{ id: 'si_1', price: { lookup_key: lookup } }] } }
}

const ws = async (id: string) => first(await getDb().select().from(schema.workspace).where(eq(schema.workspace.id, id)))

describe('Stripe webhooks', () => {
  it('rejects a bad signature and accepts a signed payload', () => {
    const payload = JSON.stringify(event('invoice.paid', { id: 'in_x', customer: 'cus_none' }))
    expect(() => parseWebhook(payload, 't=1,v1=bad')).toThrow()
    const header = getStripe().webhooks.generateTestHeaderString({ payload, secret: 'whsec_test_secret' })
    expect(parseWebhook(payload, header).type).toBe('invoice.paid')
  })

  it('a new subscription sets the plan and grants its monthly credits', async () => {
    const w = await setup()
    await handleStripeEvent(event('customer.subscription.created', subscription(w, 'mimix_pro_monthly_usd')))
    const row = await ws(w.id)
    expect(row).toMatchObject({ planId: 'pro', billingPeriod: 'monthly', subscriptionStatus: 'active', stripeSubscriptionId: `sub_${w.id}` })
    expect((await getBalance(w.id)).plan).toBe(credits('pro'))
  })

  it('processes each event once', async () => {
    const w = await setup()
    const e = event('checkout.session.completed', { id: 'cs_1', mode: 'payment', payment_status: 'paid', customer: w.customer, metadata: { workspaceId: w.id, kind: 'top_up', credits: '50000', topUp: 'topup_50k' } })
    expect(await handleStripeEvent(e)).toBe(true)
    expect(await handleStripeEvent(e)).toBe(false)
    expect((await getBalance(w.id)).topUp).toBe(50_000)
  })

  it('an upgrade adds the difference in monthly credits at once', async () => {
    const w = await setup('maker')
    await getDb().update(schema.workspace).set({ creditBalance: 1_000 }).where(eq(schema.workspace.id, w.id))
    await handleStripeEvent(event('customer.subscription.updated', subscription(w, 'mimix_pro_monthly_usd')))
    expect((await ws(w.id)).planId).toBe('pro')
    expect((await getBalance(w.id)).plan).toBe(1_000 + credits('pro') - credits('maker'))
  })

  it('a downgrade keeps this cycle’s credits', async () => {
    const w = await setup('pro')
    await getDb().update(schema.workspace).set({ creditBalance: 90_000 }).where(eq(schema.workspace.id, w.id))
    await handleStripeEvent(event('customer.subscription.updated', subscription(w, 'mimix_maker_monthly_usd')))
    expect((await ws(w.id)).planId).toBe('maker')
    expect((await getBalance(w.id)).plan).toBe(90_000)
  })

  it('a monthly renewal resets plan credits, keeps top-ups and records the invoice', async () => {
    const w = await setup('maker')
    await getDb().update(schema.workspace).set({ creditBalance: 12, topUpBalance: 500 }).where(eq(schema.workspace.id, w.id))
    await handleStripeEvent(event('invoice.paid', { id: `in_${w.id}`, object: 'invoice', customer: w.customer, billing_reason: 'subscription_cycle', amount_due: 900, amount_paid: 900, currency: 'usd', status: 'paid', number: 'MMX-0001', total_taxes: [], period_start: 1, period_end: 2, parent: { subscription_details: { subscription: `sub_${w.id}` } } }))
    expect(await getBalance(w.id)).toMatchObject({ plan: credits('maker'), topUp: 500 })
    const inv = first(await getDb().select().from(schema.invoice).where(eq(schema.invoice.workspaceId, w.id)))
    expect(inv).toMatchObject({ number: 'MMX-0001', amountPaid: 900, status: 'paid', currency: 'USD' })
  })

  it('a failed payment marks the workspace past due and emails the owner', async () => {
    const w = await setup('maker')
    await handleStripeEvent(event('invoice.payment_failed', { id: `in_f_${w.id}`, object: 'invoice', customer: w.customer, amount_due: 900, amount_paid: 0, currency: 'usd', status: 'open', total_taxes: [] }))
    expect((await ws(w.id)).subscriptionStatus).toBe('past_due')
    expect(await readOutbox({ to: w.email, tag: 'paymentFailed' })).toHaveLength(1)
  })

  it('a cancelled subscription returns the workspace to Free', async () => {
    const w = await setup('pro')
    await handleStripeEvent(event('customer.subscription.deleted', subscription(w, 'mimix_pro_monthly_usd', 'canceled')))
    expect(await ws(w.id)).toMatchObject({ planId: 'free', subscriptionStatus: 'canceled', stripeSubscriptionId: null })
    expect((await getBalance(w.id)).plan).toBe(credits('free'))
  })

  it('resets annual and Free workspaces monthly, but not monthly subscribers', async () => {
    const annual = await setup('pro', 'annual')
    const monthly = await setup('pro', 'monthly')
    const past = new Date(Date.now() - 1000)
    for (const id of [annual.id, monthly.id]) await getDb().update(schema.workspace).set({ cycleEndsAt: past, creditBalance: 3 }).where(eq(schema.workspace.id, id))
    await resetDueCycles()
    expect((await getBalance(annual.id)).plan).toBe(credits('pro'))
    expect((await getBalance(monthly.id)).plan).toBe(3)
  })
})

describe.runIf(hasStripeMock)('Stripe API (stripe-mock)', () => {
  it('creates Checkout for a plan, a top-up, and a portal session', async () => {
    const w = await setup('maker')
    expect(await createSubscriptionCheckout({ workspaceId: w.id, plan: 'pro', period: 'annual', owner: { email: w.email, name: 'Dana' } })).toMatch(/^https:/)
    expect(await createTopUpCheckout({ workspaceId: w.id, topUp: 'topup_50k', owner: { email: w.email, name: 'Dana' } })).toMatch(/^https:/)
    expect(await createPortalSession(w.id)).toMatch(/^https:/)
  })

  it('refuses top-ups on the Free plan', async () => {
    const w = await setup('free')
    await expect(createTopUpCheckout({ workspaceId: w.id, topUp: 'topup_50k', owner: { email: w.email, name: 'Dana' } })).rejects.toMatchObject({ code: 'FREE_PLAN_TOP_UP' })
  })
})
