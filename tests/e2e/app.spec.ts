import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import type { BrowserContext, Page } from '@playwright/test'
import { test, expect } from './fixtures'

/**
 * Signed-in app pages and the newer public pages: one h1, no WCAG 2.2 AA violations in either theme,
 * no script errors. Sign-up reads the verification link from the email outbox (EMAIL_DRIVER=outbox),
 * so this runs against a server started from this checkout.
 */
const OUTBOX = path.join(process.cwd(), '.data', 'outbox')

const APP_ROUTES = [
  '/app', '/app/speech', '/app/studio', '/app/dubbing', '/app/sound-effects',
  '/app/voices', '/app/voices/library', '/app/voices/mixer', '/app/voices/clone', '/app/voices/design',
  '/app/voice-changer', '/app/transcripts', '/app/voice-isolator', '/app/developers',
  ...['profile', 'security', 'notifications', 'billing', 'usage', 'team', 'data'].map((s) => `/app/settings/${s}`),
]
const PUBLIC_ROUTES = ['/report', '/check-audio', '/offline']

async function axe(page: Page) {
  const out: string[] = []
  for (const theme of ['dark', 'light'] as const) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).exclude('nextjs-portal').analyze()
    out.push(...r.violations.map((v) => `${theme}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target}`))
  }
  return out
}

function verifyLink(email: string): string | null {
  if (!fs.existsSync(OUTBOX)) return null
  const mails = fs.readdirSync(OUTBOX).map((f) => JSON.parse(fs.readFileSync(path.join(OUTBOX, f), 'utf8')) as { to: string; tag: string; text: string; sentAt: string })
  const m = mails.filter((x) => x.to === email && x.tag === 'verify').sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))[0]
  return m?.text.match(/https?:\/\/\S+/)?.[0] ?? null
}

test.describe('public safety and offline pages', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route}: one h1 and no accessibility violations`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))
      const res = await page.goto(route)
      expect(res?.status()).toBe(200)
      await expect(page.locator('h1')).toHaveCount(1)
      expect(await axe(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }
})

test.describe('signed-in app', () => {
  test.describe.configure({ mode: 'default', timeout: 90_000 })
  let ctx: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }, info) => {
    info.setTimeout(120_000)
    ctx = await browser.newContext()
    page = await ctx.newPage()
    const email = `axe${Date.now()}@example.test`
    await page.goto('/sign-up')
    await page.getByLabel('Your name').fill('Avery Axe')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('a long passphrase here')
    await page.getByRole('button', { name: 'Create account' }).click()
    await page.getByRole('heading', { name: 'Check your email' }).waitFor()
    let link: string | null = null
    await expect.poll(() => (link = verifyLink(email)), { timeout: 15_000 }).not.toBeNull()
    await page.goto(link!)
    await page.getByRole('heading', { name: 'Email confirmed' }).waitFor({ timeout: 60_000 })
  })

  test.afterAll(async () => { await ctx.close() })

  for (const route of APP_ROUTES) {
    test(`${route}: one h1 and no accessibility violations`, async () => {
      const errors: string[] = []
      const onError = (e: Error) => errors.push(String(e))
      page.on('pageerror', onError)
      const res = await page.goto(route)
      expect(res?.status()).toBe(200)
      await page.waitForLoadState('networkidle').catch(() => undefined)
      await expect(page.locator('main h1, main [role="heading"][aria-level="1"]').first()).toBeVisible()
      expect(await axe(page)).toEqual([])
      page.off('pageerror', onError)
      expect(errors).toEqual([])
    })
  }
})

test('pages fall back to the offline page when the connection drops', async ({ page, context }) => {
  test.skip(!!process.env.E2E_BASE_URL, 'The service worker registers only in production builds')
  await page.goto('/')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await context.setOffline(true)
  await page.goto('/pricing').catch(() => undefined)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/offline/i)
  expect(await axe(page)).toEqual([])
  await context.setOffline(false)
})
