import fs from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'
import { test, expect, ROUTES } from './fixtures'

/**
 * Keyboard pass: on every page, Tab from the top to the end and back to the start.
 *   - every control that can take focus is reached by Tab (nothing skipped, no trap)
 *   - every focused control shows a visible focus indicator (the focus ring, an outline or a border change)
 *   - the focused control is on screen, not under the sticky header
 */
const OUTBOX = path.join(process.cwd(), '.data', 'outbox')
const APP = ['/app', '/app/speech', '/app/studio', '/app/dubbing', '/app/sound-effects', '/app/voices', '/app/voices/library', '/app/voices/mixer', '/app/voices/clone',
  '/app/voices/design', '/app/voice-changer', '/app/transcripts', '/app/voice-isolator', '/app/developers',
  ...['profile', 'security', 'notifications', 'billing', 'usage', 'team', 'data'].map((s) => `/app/settings/${s}`)]
const ADMIN = ['/admin', '/admin/users', '/admin/voices', '/admin/generations', '/admin/plans', '/admin/flags', '/admin/developers', '/admin/system', '/admin/audit']
const AUTH = ['/sign-in', '/sign-up', '/forgot-password', '/report', '/check-audio']

function verifyLink(email: string): string | null {
  if (!fs.existsSync(OUTBOX)) return null
  const mails = fs.readdirSync(OUTBOX).map((f) => JSON.parse(fs.readFileSync(path.join(OUTBOX, f), 'utf8')) as { to: string; tag: string; text: string; sentAt: string })
  const m = mails.filter((x) => x.to === email && x.tag === 'verify').sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))[0]
  return m?.text.match(/https?:\/\/\S+/)?.[0] ?? null
}

/** Runs in the page: the controls Tab should reach, as stable descriptions. */
function tabbables(): string[] {
  const sel = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"]), audio[controls], video[controls]'
  return [...document.querySelectorAll(sel)].filter((el) => {
    const s = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    if (s.visibility === 'hidden' || s.display === 'none' || (r.width === 0 && r.height === 0)) return false
    if (el.closest('[inert], [aria-hidden="true"], dialog:not([open]), [hidden]')) return false
    // Only one radio per group is in the tab order.
    if (el instanceof HTMLInputElement && el.type === 'radio' && el.name) {
      const group = [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)] as HTMLInputElement[]
      const lead = group.find((g) => g.checked) ?? group[0]
      if (lead !== el) return false
    }
    // Roving tabindex widgets (radix radio groups, tabs, toolbars): the container hands focus to its active item.
    if (el.getAttribute('tabindex') === '-1') return false
    // Content of a closed <details> is not rendered, only its summary.
    const details = el.closest('details')
    if (details && !details.open && !el.closest('summary')) return false
    if (['radiogroup', 'tablist', 'toolbar', 'menubar', 'listbox'].includes(el.getAttribute('role') ?? '')) return false
    return true
  }).map((el) => (el as HTMLElement).dataset.kbId ?? '')
}

async function pass(page: Page, route: string) {
  const res = await page.goto(route)
  expect(res?.status(), route).toBeLessThan(400)
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined)
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}html{scroll-behavior:auto!important}' })
  // Tag every element so focus stops can be compared with what should be reachable.
  await page.evaluate(() => document.querySelectorAll('*').forEach((el, i) => { (el as HTMLElement).dataset.kbId = String(i) }))
  const expected = new Set(await page.evaluate(tabbables))
  const problems: string[] = []
  const seen = new Set<string>()
  let last = ''
  let prev = ''
  // Start from the top of the document, whatever an autofocus did.
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    const start = document.createElement('span')
    start.tabIndex = -1
    document.body.prepend(start)
    start.focus()
    start.addEventListener('blur', () => start.remove(), { once: true })
  })
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      const ring = (s.boxShadow && s.boxShadow !== 'none') || (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2)
      // A control styled as part of a larger box (e.g. a radio inside a card) may show focus on its label.
      const host = el.closest('label') as HTMLElement | null
      const hostRing = host ? getComputedStyle(host).boxShadow !== 'none' || getComputedStyle(host).outlineStyle !== 'none' : false
      const header = [...document.querySelectorAll('header')].find((h) => ['sticky', 'fixed'].includes(getComputedStyle(h).position)) ?? null
      const hr = header?.getBoundingClientRect()
      const overlapsX = !!hr && r.right > hr.left && r.left < hr.right
      const floats = ['fixed', 'absolute'].includes(s.position)
      const headerBottom = header && ['sticky', 'fixed'].includes(getComputedStyle(header).position) && overlapsX && !header.contains(el) && !floats && !el.closest('[role="dialog"]') ? header.getBoundingClientRect().bottom : 0
      const visible = (r.bottom > headerBottom + 2 || r.height === 0) && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth
      const label = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('name') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40)
      return { id: el.dataset.kbId ?? '', label: `${el.tagName.toLowerCase()} "${label}"`, ring: ring || hostRing, visible }
    })
    if (!info) break
    // Date and time inputs move between their own fields on Tab: the same element stays focused.
    if (info.id === prev) continue
    prev = info.id
    if (seen.has(info.id)) break
    seen.add(info.id)
    last = info.label
    if (!info.ring) problems.push(`${route}: no visible focus on ${info.label}`)
    if (!info.visible) problems.push(`${route}: ${info.label} is focused off screen or under the header`)
  }
  const missed = [...expected].filter((id) => id && !seen.has(id))
  if (missed.length) {
    const names = await page.evaluate((ids) => ids.map((id) => {
      const el = document.querySelector(`[data-kb-id="${id}"]`) as HTMLElement | null
      return el ? `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 30)}"` : id
    }), missed.slice(0, 5))
    problems.push(`${route}: Tab never reached ${missed.length} control(s) after ${seen.size} stops, the last ${last}: ${names.join(', ')}`)
  }
  // Shift+Tab walks back without getting stuck.
  await page.keyboard.press('Shift+Tab')
  const back = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.kbId ?? null)
  if (seen.size > 1 && !back) problems.push(`${route}: Shift+Tab lost focus`)
  return problems
}

test.describe('keyboard pass', () => {
  test.describe.configure({ mode: 'serial', timeout: 20 * 60_000 })

  test('public pages', async ({ page }) => {
    const problems: string[] = []
    for (const route of [...ROUTES, ...AUTH]) problems.push(...(await pass(page, route)))
    expect(problems).toEqual([])
  })

  test('app and admin pages', async ({ page }) => {
    const email = `kbd${Date.now()}@example.test`
    await page.goto('/sign-up')
    await page.getByLabel('Your name').fill('Kay Board')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('a long passphrase here')
    await page.getByRole('button', { name: 'Create account' }).click()
    await page.getByRole('heading', { name: 'Check your email' }).waitFor()
    let link: string | null = null
    await expect.poll(() => (link = verifyLink(email)), { timeout: 15_000 }).not.toBeNull()
    await page.goto(link!)
    await page.getByRole('heading', { name: 'Email confirmed' }).waitFor({ timeout: 60_000 })
    const problems: string[] = []
    for (const route of APP) problems.push(...(await pass(page, route)))
    expect((await page.request.post('/api/test/staff', { data: { email, role: 'admin' } })).ok()).toBe(true)
    for (const route of ADMIN) problems.push(...(await pass(page, route)))
    expect(problems).toEqual([])
  })
})
