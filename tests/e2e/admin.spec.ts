import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { createOTP } from '@better-auth/utils/otp'
import type { Browser, BrowserContext, Page } from '@playwright/test'
import { test, expect } from './fixtures'

/**
 * The admin console: an Admin finds a user, adjusts their credits (with the re-auth step), and
 * every console section passes WCAG 2.2 AA in both themes. Needs ENABLE_TEST_ROUTES=1 and the
 * email outbox, so it runs against a server started from this checkout.
 */
const OUTBOX = path.join(process.cwd(), '.data', 'outbox')
const PASSWORD = 'a long passphrase here'
const SECTIONS = ['/admin', '/admin/users', '/admin/voices', '/admin/voices?tab=publish', '/admin/voices?tab=consent', '/admin/voices?tab=blocklist',
  '/admin/generations', '/admin/generations?tab=reports', '/admin/plans', '/admin/flags', '/admin/developers', '/admin/developers?tab=webhooks', '/admin/system', '/admin/audit']

function verifyLink(email: string): string | null {
  if (!fs.existsSync(OUTBOX)) return null
  const mails = fs.readdirSync(OUTBOX).map((f) => JSON.parse(fs.readFileSync(path.join(OUTBOX, f), 'utf8')) as { to: string; tag: string; text: string; sentAt: string })
  const m = mails.filter((x) => x.to === email && x.tag === 'verify').sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))[0]
  return m?.text.match(/https?:\/\/\S+/)?.[0] ?? null
}

async function signUp(browser: Browser, name: string): Promise<{ ctx: BrowserContext; page: Page; email: string }> {
  // Its own client address, so the sign-up rate limit never carries over between runs.
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': `10.${[0, 0, 0].map(() => Math.floor(Math.random() * 250) + 1).join('.')}` } })
  const page = await ctx.newPage()
  const email = `${name.toLowerCase().replace(/\W/g, '')}${Date.now()}@example.test`
  await page.goto('/sign-up')
  await page.getByLabel('Your name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByRole('heading', { name: 'Check your email' }).waitFor()
  let link: string | null = null
  await expect.poll(() => (link = verifyLink(email)), { timeout: 15_000 }).not.toBeNull()
  await page.goto(link!)
  await page.getByRole('heading', { name: 'Email confirmed' }).waitFor({ timeout: 60_000 })
  return { ctx, page, email }
}

async function axe(page: Page) {
  const out: string[] = []
  for (const theme of ['dark', 'light'] as const) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).exclude('nextjs-portal').analyze()
    out.push(...r.violations.map((v) => `${theme}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target}`))
  }
  return out
}

test.describe('admin console', () => {
  test.describe.configure({ mode: 'default', timeout: 120_000 })
  let admin: { ctx: BrowserContext; page: Page; email: string }
  let secret = ''

  test.beforeAll(async ({ browser }, info) => {
    info.setTimeout(180_000)
    admin = await signUp(browser, 'Ada Admin')
    // Before promotion, the console doesn't exist for this account.
    expect((await admin.page.goto('/admin'))?.status()).toBe(404)
    const r = await admin.page.request.post('/api/test/staff', { data: { email: admin.email, role: 'admin' } })
    expect(r.ok()).toBe(true)
    secret = (await r.json()).secret
  })
  test.afterAll(async () => { await admin?.ctx.close() })

  test('an Admin finds a user and adjusts their credits', async ({ browser }) => {
    const user = await signUp(browser, 'Uma User')
    await user.ctx.close()
    const page = admin.page
    await page.goto('/admin/users')
    await page.getByLabel('Search by email, name or user ID').fill(user.email)
    await page.getByRole('button', { name: 'Search' }).click()
    await page.getByRole('link', { name: user.email }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Uma User' })).toBeVisible()
    const balanceCell = page.getByRole('region', { name: 'Workspaces' }).locator('tbody tr').first().locator('td').nth(3)
    const before = Number((await balanceCell.innerText()).replace(/\D/g, ''))

    await page.getByRole('button', { name: 'Adjust credits' }).click()
    const dialog = page.getByRole('dialog', { name: 'Adjust credits' })
    await dialog.getByLabel('Credits').fill('5000')
    await dialog.getByLabel('Reason').fill('Goodwill credit after outage')
    await dialog.getByRole('button', { name: 'Adjust credits' }).click()
    await expect(dialog).toBeHidden()
    await expect.poll(async () => Number((await balanceCell.innerText()).replace(/\D/g, ''))).toBe(before + 5000)
    await expect(page.getByRole('region', { name: 'Credit adjustments' })).toContainText('Goodwill credit after outage')

    // Suspending is destructive: the console asks for the password and a code first.
    await page.getByRole('button', { name: 'Suspend' }).click()
    const s = page.getByRole('dialog', { name: 'Suspend' })
    await s.getByLabel('Reason').fill('Testing the re-auth step')
    await s.getByRole('button', { name: 'Suspend' }).click()
    const re = page.getByRole('dialog', { name: 'Confirm it’s you' })
    await expect(re).toBeVisible()
    await re.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await re.getByLabel('6-digit code from your authenticator app').fill(await createOTP(secret, { period: 30, digits: 6 }).totp())
    await re.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('main').getByText('Suspended', { exact: true })).toBeVisible()

    await page.goto(`/admin/audit?action=admin.`)
    await expect(page.getByRole('region', { name: 'Audit log' })).toContainText('admin.credits_adjusted')
    await expect(page.getByRole('region', { name: 'Audit log' })).toContainText('admin.user_suspended')
  })

  for (const route of SECTIONS) {
    test(`${route}: one h1 and no accessibility violations`, async () => {
      const page = admin.page
      const errors: string[] = []
      const onError = (e: Error) => errors.push(String(e))
      page.on('pageerror', onError)
      const res = await page.goto(route)
      expect(res?.status()).toBe(200)
      await expect(page.locator('main h1')).toHaveCount(1)
      expect(await axe(page)).toEqual([])
      page.off('pageerror', onError)
      expect(errors).toEqual([])
    })
  }

  test('a non-admin section sends Support back to the overview', async ({ browser }) => {
    const sup = await signUp(browser, 'Sam Support')
    await sup.page.request.post('/api/test/staff', { data: { email: sup.email, role: 'support' } })
    await sup.page.goto('/admin/plans')
    await expect(sup.page).toHaveURL(/\/admin\?denied=1$/)
    await expect(sup.page.getByRole('status').first()).toContainText('Your role can’t open that section')
    await expect(sup.page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link')).toHaveText(['Overview', 'Users', 'Generations', 'Developers'])
    await sup.ctx.close()
  })
})
