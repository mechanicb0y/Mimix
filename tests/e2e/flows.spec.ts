import fs from 'node:fs'
import path from 'node:path'
import Stripe from 'stripe'
import type { APIRequestContext, BrowserContext, Page } from '@playwright/test'
import { test, expect } from './fixtures'

/**
 * The launch flows, end to end in one account, in the order a new customer meets them:
 *   1. sign up → verify the email → generate speech → download it
 *   2. upgrade to Pro through Stripe Checkout (stripe-mock; the test plays Stripe and sends the
 *      signed webhook, exactly as Stripe test mode would after a test card)
 *   3. clone a voice with consent (samples, phrase, recording, verified voice; with CLONE_CONSENT=attest,
 *      samples and the ticked confirmation only)
 *   4. mix two voices in the Voice Mixer and save the mix
 * The fifth launch flow, an Admin adjusting a user's credits, is in admin.spec.ts.
 */
const OUTBOX = path.join(process.cwd(), '.data', 'outbox')
const LONG = 'The morning market fills with the smell of fresh bread and coffee, and people call out to friends across the square. '
  + 'By noon the light turns gold on the old stone walls, and the river slows as if it were resting. In the evening the bridges glow and the gardens fall quiet.'

function verifyLink(email: string): string | null {
  if (!fs.existsSync(OUTBOX)) return null
  const mails = fs.readdirSync(OUTBOX).map((f) => JSON.parse(fs.readFileSync(path.join(OUTBOX, f), 'utf8')) as { to: string; tag: string; text: string; sentAt: string })
  const m = mails.filter((x) => x.to === email && x.tag === 'verify').sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))[0]
  return m?.text.match(/https?:\/\/\S+/)?.[0] ?? null
}

/** Speech from a library voice as WAV bytes, made through the app's own API with the session. */
async function speech(page: Page, text: string, voiceId = 'lib_wren'): Promise<Buffer> {
  const origin = new URL(page.url()).origin
  const r = await page.request.post('/api/v1/text-to-speech', { headers: { origin }, data: { text, voiceId, format: 'wav' } })
  expect(r.status(), await r.text()).toBe(201)
  const file = await page.request.get((await r.json()).audioUrl as string)
  expect(file.status()).toBe(200)
  return Buffer.from(await file.body())
}

async function workspaceOf(request: APIRequestContext, email: string) {
  const r = await request.post('/api/test/workspace', { data: { email } })
  expect(r.status()).toBe(200)
  return (await r.json()) as { workspaceId: string; customer: string | null; plan: string }
}

test.describe('launch flows', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 })
  let ctx: BrowserContext
  let page: Page
  const email = `flow${Date.now()}@example.test`

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext({ acceptDownloads: true, extraHTTPHeaders: { 'x-forwarded-for': `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}` } })
    page = await ctx.newPage()
  })
  test.afterAll(async () => { await ctx.close() })

  test('1 · sign up, verify, generate speech and download it', async () => {
    await page.goto('/sign-up')
    await page.getByLabel('Your name').fill('Flo Flow')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('a long passphrase here')
    await page.getByRole('button', { name: 'Create account' }).click()
    await page.getByRole('heading', { name: 'Check your email' }).waitFor()
    let link: string | null = null
    await expect.poll(() => (link = verifyLink(email)), { timeout: 15_000 }).not.toBeNull()
    await page.goto(link!)
    await page.getByRole('heading', { name: 'Email confirmed' }).waitFor({ timeout: 60_000 })

    await page.goto('/app/speech')
    await page.getByRole('textbox', { name: 'Text' }).fill('Hello from Mimix. This is my first generation.')
    await page.getByRole('button', { name: 'Generate speech' }).click()
    const download = page.getByRole('link', { name: /^Download .*: / }).first()
    await expect(download).toBeVisible({ timeout: 30_000 })
    const [file] = await Promise.all([page.waitForEvent('download'), download.click()])
    const bytes = fs.readFileSync((await file.path())!)
    expect(bytes.length).toBeGreaterThan(1000)
    expect(['ID3', 'RIF'].includes(bytes.subarray(0, 3).toString('latin1')) || bytes[0] === 0xff).toBe(true)
  })

  test('1b · work keeps running while you change page, shows in the header and says when it is done', async () => {
    const origin = new URL(page.url()).origin
    await page.goto('/app/speech')
    const r = await page.request.post('/api/test/slow-job', { headers: { origin }, data: { steps: 12, title: 'Long chapter' } })
    expect(r.status(), await r.text()).toBe(202)
    const menu = page.getByTestId('jobs-menu')
    await expect(menu).toHaveAttribute('aria-label', 'Jobs, 1 running', { timeout: 25_000 })
    // Change page twice: the job is still there, with its progress.
    await page.getByRole('navigation', { name: 'Product' }).getByRole('link', { name: 'Voice Isolator' }).click()
    await page.waitForURL(/voice-isolator/)
    await expect(menu).toHaveAttribute('aria-label', 'Jobs, 1 running')
    await page.goto('/app/transcripts')
    await menu.click()
    await expect(page.getByText('Long chapter')).toBeVisible()
    await expect(page.getByRole('progressbar', { name: /% done/ })).toBeVisible()
    await page.keyboard.press('Escape')
    // It finishes on the server and announces itself.
    await expect(page.getByText(/is ready/).first()).toBeVisible({ timeout: 30_000 })
    await expect(menu).toHaveAttribute('aria-label', 'Jobs')
  })

  test('2 · upgrade to Pro through Stripe Checkout', async () => {
    test.skip(!process.env.STRIPE_API_BASE, 'Needs stripe-mock: STRIPE_API_BASE=http://localhost:12111')
    let checkoutUrl = ''
    await ctx.route('https://checkout.stripe.com/**', (route) => { checkoutUrl = route.request().url(); return route.fulfill({ contentType: 'text/html', body: '<title>Stripe Checkout (test)</title><h1>Checkout</h1>' }) })
    await page.goto('/app/settings/billing')
    await page.getByRole('button', { name: 'Choose Pro', exact: true }).click()
    await expect.poll(() => checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//)

    // Stripe confirms the subscription with a signed webhook after the test card is accepted.
    const ws = await workspaceOf(page.request, email)
    const event = {
      id: `evt_e2e_${Date.now()}`, object: 'event', type: 'customer.subscription.created', api_version: null, created: Math.floor(Date.now() / 1000), livemode: false, pending_webhooks: 0, request: null,
      data: { object: { id: `sub_e2e_${ws.workspaceId}`, object: 'subscription', customer: ws.customer ?? `cus_e2e_${ws.workspaceId}`, status: 'active', cancel_at_period_end: false, metadata: { workspaceId: ws.workspaceId }, items: { data: [{ id: 'si_e2e', price: { lookup_key: 'mimix_pro_monthly_usd' } }] } } },
    }
    const payload = JSON.stringify(event)
    const signature = new Stripe('sk_test_e2e').webhooks.generateTestHeaderString({ payload, secret: process.env.E2E_STRIPE_WEBHOOK_SECRET! })
    const hook = await page.request.post('/api/webhooks/stripe', { headers: { 'stripe-signature': signature, 'content-type': 'application/json' }, data: payload })
    expect(hook.status(), await hook.text()).toBe(200)

    await page.goto('/app/settings/billing?checkout=success')
    await expect(page.getByText('Payment received. Your plan updates in a moment.')).toBeVisible()
    await expect.poll(async () => (await workspaceOf(page.request, email)).plan).toBe('pro')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Choose Pro', exact: true })).toBeDisabled()
  })

  test('3 · clone a voice with consent', async () => {
    test.skip(!process.env.STRIPE_API_BASE, 'Instant cloning needs the Pro plan from step 2')
    const samples = [await speech(page, LONG), await speech(page, LONG.split('. ').reverse().join('. ')), await speech(page, `${LONG} ${LONG}`)]
    await page.goto('/app/voices/clone')
    await page.getByRole('radio', { name: /^Instant clone/ }).check()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.locator('input[type="file"]').first().setInputFiles(samples.map((buffer, i) => ({ name: `take-${i + 1}.wav`, mimeType: 'audio/wav', buffer })))
    for (let i = 1; i <= 3; i++) await expect(page.getByText(`take-${i}.wav`, { exact: true })).toBeVisible({ timeout: 30_000 })
    await page.getByLabel('Voice name').fill('Flo clone')
    await page.getByRole('checkbox', { name: /I am the speaker/ }).check()
    if (process.env.CLONE_CONSENT === 'attest') {
      // Consent by confirmation (your own computer): no read-aloud step.
      await expect(page.getByRole('listitem').filter({ hasText: 'Consent' })).toHaveCount(0)
      await page.getByRole('button', { name: 'Create voice' }).click()
      await expect(page.getByRole('heading', { name: 'Flo clone is ready' })).toBeVisible({ timeout: 60_000 })
      await expect(page.getByText('We kept a consent record of your confirmation')).toBeVisible()
      return
    }
    await page.getByRole('button', { name: 'Continue to consent' }).click()

    const quote = page.locator('blockquote')
    await expect(quote).toContainText('My code words are', { timeout: 60_000 })
    const phrase = (await quote.innerText()).replace(/[“”]/g, '').trim()
    const consent = await speech(page, phrase)
    await page.getByLabel('Or upload a recording').setInputFiles({ name: 'consent.wav', mimeType: 'audio/wav', buffer: consent })
    await page.getByRole('button', { name: 'Verify and create voice' }).click()
    await expect(page.getByRole('heading', { name: 'Flo clone is ready' })).toBeVisible({ timeout: 60_000 })
  })

  test('4 · mix two voices and save the mix', async () => {
    await page.goto('/app/voices/mixer')
    const preview = page.getByRole('button', { name: 'Preview blend' })
    await expect(preview).toBeEnabled({ timeout: 30_000 })
    const [res] = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/v1/voices/mix/preview')), preview.click()])
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toMatch(/^audio\//)
    await page.getByLabel('Name', { exact: true }).fill('Flo blend')
    await page.getByRole('button', { name: 'Save voice' }).click()
    await expect(page.getByText('Flo blend is saved to My voices.').first()).toBeVisible({ timeout: 30_000 })
    await page.getByRole('link', { name: 'Open in My voices' }).click()
    await expect(page.getByRole('heading', { name: 'Flo blend', level: 1 })).toBeVisible()
  })
})
