import { test, expect, ROUTES } from './fixtures'

/** Every link on the public pages leads somewhere: same-site links answer below 400 (redirects followed). */
const AUTH = ['/sign-in', '/sign-up', '/forgot-password', '/report', '/check-audio']

test('no broken links on the public pages', async ({ page, request }) => {
  test.setTimeout(10 * 60_000)
  const targets = new Map<string, string>()
  for (const route of [...ROUTES, ...AUTH]) {
    await page.goto(route)
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href))
    for (const href of hrefs) {
      const u = new URL(href)
      if (u.origin !== new URL(page.url()).origin) continue
      u.hash = ''
      if (!targets.has(u.toString())) targets.set(u.toString(), route)
    }
  }
  const broken: string[] = []
  for (const [url, from] of targets) {
    const r = await request.get(url, { maxRedirects: 5 })
    if (r.status() >= 400) broken.push(`${new URL(url).pathname}${new URL(url).search} (${r.status()}) linked from ${from}`)
  }
  expect(targets.size).toBeGreaterThan(30)
  expect(broken).toEqual([])
})
