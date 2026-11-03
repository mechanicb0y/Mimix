import fs from 'node:fs'
import path from 'node:path'
import type { BrowserContext, Page } from '@playwright/test'
import { test, expect, ROUTES } from './fixtures'

/**
 * Layout sweep: every page at 375, 768, 1024, 1440 and 1920 px, in both themes (375 and 768 on a touch device).
 *   - no horizontal page scroll, and nothing pokes out past the right edge
 *   - every control is at least 24 × 24 px (WCAG 2.5.8); on touch widths (375 and 768) buttons,
 *     fields and menu items are at least 44 px tall, as the brief asks (inline text links exempt)
 * Screenshots (viewport, both themes) go to SHOTS_DIR when it is set, for the visual review.
 */
const DESKTOP = [1024, 1440, 1920]
// Phones and tablets are swept in a touch context, so `pointer: coarse` styles apply as on a real device.
const TOUCH = [375, 768]
const SHOTS = process.env.SHOTS_DIR
const OUTBOX = path.join(process.cwd(), '.data', 'outbox')

const APP = ['/app', '/app/speech', '/app/studio', '/app/dubbing', '/app/sound-effects', '/app/voices', '/app/voices/library', '/app/voices/mixer', '/app/voices/clone',
  '/app/voices/design', '/app/voice-changer', '/app/transcripts', '/app/voice-isolator', '/app/developers',
  ...['profile', 'security', 'notifications', 'billing', 'usage', 'team', 'data'].map((s) => `/app/settings/${s}`)]
const ADMIN = ['/admin', '/admin/users', '/admin/voices', '/admin/generations', '/admin/plans', '/admin/flags', '/admin/developers', '/admin/system', '/admin/audit']
const AUTH = ['/sign-in', '/sign-up', '/forgot-password', '/report', '/check-audio']

interface Finding { route: string; width: number; kind: 'overflow' | 'target' | 'touch'; detail: string }

/** Runs in the page: layout problems at the current viewport. */
function inspect(touch: boolean) {
  const vw = window.innerWidth
  const out: Array<{ kind: 'overflow' | 'target' | 'touch'; detail: string }> = []
  const name = (el: Element) => {
    const h = el as HTMLElement
    const label = (h.getAttribute('aria-label') || h.innerText || h.getAttribute('name') || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    return `${el.tagName.toLowerCase()}${h.id ? `#${h.id}` : ''}${h.classList.length ? `.${[...h.classList].slice(0, 2).join('.')}` : ''} "${label}"`
  }
  const visible = (el: Element) => {
    const s = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0 && !(r.width <= 1 && r.height <= 1) && el.closest('[aria-hidden="true"], .sr-only, [inert]') === null
  }
  const clipped = (el: Element) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX
      if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true
    }
    return false
  }
  if (document.documentElement.scrollWidth > vw + 1) out.push({ kind: 'overflow', detail: `page scrolls sideways: ${document.documentElement.scrollWidth}px wide` })
  let poke = 0
  for (const el of document.body.querySelectorAll('*')) {
    if (poke >= 3) break
    const r = el.getBoundingClientRect()
    if (r.right > vw + 1 && visible(el) && !clipped(el) && getComputedStyle(el).position !== 'fixed') { out.push({ kind: 'overflow', detail: `${name(el)} ends at ${Math.round(r.right)}px` }); poke++ }
  }
  const controls = document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="menuitem"], [role="radio"], [role="checkbox"], [role="slider"], [role="switch"]')
  for (const el of controls) {
    if (!visible(el)) continue
    const r = el.getBoundingClientRect()
    const tag = el.tagName.toLowerCase()
    // Inline links (and link-styled buttons) inside a sentence are exempt from 2.5.8 (the "inline" exception).
    // (Chrome computes a button's `display: inline` as inline-block, so link-styled buttons accept both.)
    const disp = getComputedStyle(el).display
    const inline = (tag === 'a' ? disp === 'inline' : el.classList.contains('link') && (disp === 'inline' || disp === 'inline-block')) && !!el.parentElement && /\S/.test([...el.parentElement.childNodes].filter((n) => n !== el && n.nodeType === 3).map((n) => n.textContent).join(''))
    if (inline) continue
    // A native checkbox or radio inside its label: the label is the target.
    const inLabel = (tag === 'input' && ['checkbox', 'radio'].includes((el as HTMLInputElement).type)) ? el.closest('label') : null
    const box = inLabel ? inLabel.getBoundingClientRect() : r
    if (box.width < 24 || box.height < 24) out.push({ kind: 'target', detail: `${name(el)} is ${Math.round(box.width)}×${Math.round(box.height)}` })
    else if (touch && tag !== 'a' && box.height < 44 && !(el as HTMLElement).closest('table')) out.push({ kind: 'touch', detail: `${name(el)} is ${Math.round(box.height)}px tall` })
  }
  return out
}

function verifyLink(email: string): string | null {
  if (!fs.existsSync(OUTBOX)) return null
  const mails = fs.readdirSync(OUTBOX).map((f) => JSON.parse(fs.readFileSync(path.join(OUTBOX, f), 'utf8')) as { to: string; tag: string; text: string; sentAt: string })
  const m = mails.filter((x) => x.to === email && x.tag === 'verify').sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))[0]
  return m?.text.match(/https?:\/\/\S+/)?.[0] ?? null
}

async function sweep(page: Page, route: string, widths: number[], touch: boolean): Promise<Finding[]> {
  const found: Finding[] = []
  await page.setViewportSize({ width: widths[0] ?? 1440, height: 900 })
  const res = await page.goto(route)
  expect(res?.status(), route).toBeLessThan(400)
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined)
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' })
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 768 ? 812 : 900 })
    await page.waitForTimeout(150)
    for (const f of await page.evaluate(inspect, touch)) found.push({ route, width, ...f })
    if (SHOTS) {
      for (const theme of ['light', 'dark'] as const) {
        await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
        const file = path.join(SHOTS, `${route.replace(/^\//, '').replace(/[/?=&]/g, '_') || 'home'}`, `${width}-${theme}.jpg`)
        fs.mkdirSync(path.dirname(file), { recursive: true })
        await page.screenshot({ path: file, type: 'jpeg', quality: 55 })
      }
    }
  }
  return found
}

test.describe('layout sweep', () => {
  test.describe.configure({ mode: 'serial', timeout: 30 * 60_000 })
  let ctx: BrowserContext
  let page: Page
  let touchCtx: BrowserContext
  let touchPage: Page
  const findings: Finding[] = []
  const headers = { 'x-forwarded-for': `10.${[0, 0, 0].map(() => Math.floor(Math.random() * 250) + 1).join('.')}` }
  const both = async (routes: string[]) => {
    for (const route of routes) {
      findings.push(...(await sweep(touchPage, route, TOUCH, true)))
      findings.push(...(await sweep(page, route, DESKTOP, false)))
    }
  }
  /** The touch context signs in with the same session cookie as the desktop one. */
  const shareSession = async (browser: import('@playwright/test').Browser) => {
    await touchCtx?.close()
    touchCtx = await browser.newContext({ extraHTTPHeaders: headers, hasTouch: true, isMobile: true, storageState: await ctx.storageState() })
    touchPage = await touchCtx.newPage()
  }

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext({ extraHTTPHeaders: headers })
    page = await ctx.newPage()
    await shareSession(browser)
  })
  test.afterAll(async () => {
    await ctx.close()
    await touchCtx.close()
    if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'findings.json'), JSON.stringify(findings, null, 1))
  })

  test('public pages', async () => {
    await both([...ROUTES, ...AUTH])
  })

  test('app and admin pages', async ({ browser }) => {
    const email = `layout${Date.now()}@example.test`
    await page.goto('/sign-up')
    await page.getByLabel('Your name').fill('Lee Layout')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('a long passphrase here')
    await page.getByRole('button', { name: 'Create account' }).click()
    await page.getByRole('heading', { name: 'Check your email' }).waitFor()
    let link: string | null = null
    await expect.poll(() => (link = verifyLink(email)), { timeout: 15_000 }).not.toBeNull()
    await page.goto(link!)
    await page.getByRole('heading', { name: 'Email confirmed' }).waitFor({ timeout: 60_000 })
    await shareSession(browser)
    await both(APP)
    expect((await page.request.post('/api/test/staff', { data: { email, role: 'admin' } })).ok()).toBe(true)
    await both(ADMIN)
  })

  test('nothing overflows and every control is big enough', () => {
    const lines = findings.map((f) => `${f.route} @${f.width}: ${f.kind}: ${f.detail}`)
    expect(lines).toEqual([])
  })
})
