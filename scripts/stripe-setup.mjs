#!/usr/bin/env node
/**
 * Creates (or updates) the Stripe products and prices for Mimix plans, found later by lookup key.
 * Safe to run more than once. Uses STRIPE_SECRET_KEY (test or live) and STRIPE_API_BASE if set.
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs
 * Prices come from src/config/plans.ts (read as text, so this script needs no build step).
 */
import Stripe from 'stripe'
import { readFileSync } from 'node:fs'

const key = process.env.STRIPE_SECRET_KEY
if (!key) { console.error('Set STRIPE_SECRET_KEY first (never paste it into chat).'); process.exit(1) }
const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null
const stripe = new Stripe(key, base ? { host: base.hostname, port: Number(base.port), protocol: base.protocol.replace(':', '') } : {})

const src = readFileSync(new URL('../src/config/plans.ts', import.meta.url), 'utf8')
const plans = [...src.matchAll(/\{ id: '(maker|pro|production|team)', prices: \{ USD: \{ monthly: (\d+), annualPerMonth: (\d+) \} \}, creditsPerMonth: ([\d_]+)/g)]
  .map((m) => ({ id: m[1], monthly: Number(m[2]), annualPerMonth: Number(m[3]), credits: Number(m[4].replaceAll('_', '')) }))
if (plans.length !== 4) { console.error('Could not read the four paid plans from plans.ts'); process.exit(1) }

const names = { maker: 'Maker', pro: 'Pro', production: 'Production', team: 'Team' }
for (const p of plans) {
  const productId = `mimix_${p.id}`
  let product
  try { product = await stripe.products.retrieve(productId) } catch { product = null }
  if (!product) product = await stripe.products.create({ id: productId, name: `Mimix ${names[p.id]}`, description: `${p.credits.toLocaleString('en-US')} credits a month` })
  for (const [period, amount, interval] of [['monthly', p.monthly, 'month'], ['annual', p.annualPerMonth * 12, 'year']]) {
    const lookup_key = `mimix_${p.id}_${period}_usd`
    const existing = (await stripe.prices.list({ lookup_keys: [lookup_key], active: true, limit: 1 })).data[0]
    if (existing && existing.unit_amount === amount && existing.lookup_key === lookup_key) { console.log(`ok      ${lookup_key}`); continue }
    await stripe.prices.create({ product: product.id, currency: 'usd', unit_amount: amount, recurring: { interval }, lookup_key, transfer_lookup_key: true, tax_behavior: 'exclusive', metadata: { plan: p.id, period } })
    console.log(`created ${lookup_key} ${(amount / 100).toFixed(2)} USD/${interval}`)
  }
}
console.log('Done. Next: add the webhook endpoint <APP_URL>/api/webhooks/stripe in the Stripe dashboard.')
