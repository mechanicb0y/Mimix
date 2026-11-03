import AxeBuilder from '@axe-core/playwright'
import { test, expect, ROUTES } from './fixtures'

for (const path of ROUTES) {
  test(`${path}: SEO tags and no accessibility violations`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    const res = await page.goto(path)
    expect(res?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveCount(1)
    const title = await page.title()
    expect(title.length).toBeLessThanOrEqual(60)
    const desc = await page.locator('meta[name="description"]').getAttribute('content')
    expect(desc?.length ?? 0).toBeLessThanOrEqual(155)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path === '/' ? '/?' : path}$`))
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title)
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
    for (const ld of await page.locator('script[type="application/ld+json"]').allTextContents()) expect(() => JSON.parse(ld)).not.toThrow()
    expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0)
    // Contrast is judged on the settled page: no fade-in or colour transition caught halfway (they made this flaky on a slow machine).
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' })
    for (const theme of ['dark', 'light'] as const) {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
      expect(results.violations.map((v) => `${theme}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target}`)).toEqual([])
    }
    expect(errors).toEqual([])
  })
}

test('404 page returns 404 with a way home', async ({ page }) => {
  const res = await page.goto('/no-such-page')
  expect(res?.status()).toBe(404)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await expect(page.getByRole('main').getByRole('link', { name: /home/i }).first()).toBeVisible()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()
  expect(results.violations).toEqual([])
})

test('500 page shows a retry and a way home', async ({ page }) => {
  await page.goto('/test-error')
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.getByRole('button', { name: /try again/i })).toBeVisible()
})

test('sitemap and robots are served', async ({ request }) => {
  const sm = await request.get('/sitemap.xml')
  expect(sm.status()).toBe(200)
  const xml = await sm.text()
  expect(xml).toContain('/voice-mixer')
  expect(xml).not.toContain('/test-error')
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toMatch(/Sitemap:/)
})

test('sample audio is a WAV file', async ({ request }) => {
  const r = await request.get('/audio/samples/home-wren')
  expect(r.status()).toBe(200)
  expect(r.headers()['content-type']).toContain('audio/wav')
})

test('demo API rejects cross-site posts', async ({ request }) => {
  const r = await request.post('/api/demo/tts', { data: { text: 'hi', voiceId: 'wren' }, headers: { Origin: 'https://evil.example' } })
  expect(r.status()).toBe(403)
})
