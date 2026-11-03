import { test, expect, gotoHydrated } from './fixtures'

test.describe('scroll reveal', () => {
  test('arms when motion is allowed', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveClass(/reveal-armed/)
  })
  test('stays off under reduced motion, so content is visible without scrolling', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('html')).not.toHaveClass(/reveal-armed/)
    const last = page.locator('[data-reveal]').last()
    expect(await last.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
  })
})

test.describe('hero demo', () => {
  test('generates speech and can be stopped', async ({ page }) => {
    await page.goto('/')
    const demo = page.getByRole('region', { name: /try it/i })
    const res = page.waitForResponse((r) => r.url().endsWith('/api/demo/tts'))
    await demo.getByRole('button', { name: 'Play' }).click()
    const r = await res
    expect(r.status()).toBe(200)
    expect(r.headers()['content-type']).toContain('audio/wav')
    await expect(demo.getByRole('button', { name: 'Stop' })).toBeVisible()
    await demo.getByRole('button', { name: 'Stop' }).click()
    await expect(demo.getByRole('button', { name: 'Play' })).toBeVisible()
  })
  test('blocks text over the limit', async ({ page }) => {
    await page.goto('/')
    const demo = page.getByRole('region', { name: /try it/i })
    await demo.getByRole('textbox').fill('a'.repeat(301))
    await expect(demo.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    await expect(demo.getByRole('button', { name: 'Play' })).toBeDisabled()
  })
})

test.describe('sample players', () => {
  test('starting one player pauses the others', async ({ page }) => {
    await page.goto('/products/text-to-speech')
    const buttons = page.locator('.player-btn')
    expect(await buttons.count()).toBeGreaterThanOrEqual(2)
    await buttons.nth(0).click()
    await expect(buttons.nth(0)).toHaveAttribute('aria-pressed', 'true')
    await buttons.nth(1).click()
    await expect(buttons.nth(1)).toHaveAttribute('aria-pressed', 'true')
    await expect(buttons.nth(0)).toHaveAttribute('aria-pressed', 'false')
  })
  test('the waveform is a keyboard slider', async ({ page }) => {
    await page.goto('/products/text-to-speech')
    const slider = page.getByRole('slider').first()
    await slider.focus()
    await page.keyboard.press('End')
    expect(Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThan(0)
  })
})

test.describe('pricing', () => {
  test('monthly and annual toggle updates prices', async ({ page }) => {
    await page.goto('/pricing')
    const pro = page.getByTestId('price-pro')
    await expect(pro).toHaveText('$29')
    await page.getByRole('radio', { name: /Annual/ }).click()
    await expect(pro).toHaveText('$23.20')
    await expect(page.getByRole('status').filter({ hasText: 'annual prices' })).toBeAttached()
    await page.getByRole('radio', { name: /Monthly/ }).click()
    await expect(pro).toHaveText('$29')
  })
})

test.describe('FAQ accordion', () => {
  test('keeps one panel open with aria-expanded in sync', async ({ page }) => {
    await page.goto('/pricing')
    const triggers = page.locator('.faq-trigger')
    await triggers.nth(0).click()
    await expect(triggers.nth(0)).toHaveAttribute('aria-expanded', 'true')
    await triggers.nth(1).click()
    await expect(triggers.nth(1)).toHaveAttribute('aria-expanded', 'true')
    await expect(triggers.nth(0)).toHaveAttribute('aria-expanded', 'false')
    await triggers.nth(1).click()
    await expect(triggers.nth(1)).toHaveAttribute('aria-expanded', 'false')
  })
})

test.describe('newsletter', () => {
  test('validates inline, then succeeds', async ({ page }) => {
    await page.goto('/')
    const form = page.locator('footer form')
    const email = form.getByLabel('Email address')
    await form.getByRole('button', { name: 'Subscribe' }).click()
    await expect(form.getByText('Enter your email address.')).toBeVisible()
    await expect(email).toBeFocused()
    await email.fill('not-an-email')
    await email.blur()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await email.fill('reader@example.com')
    await form.getByRole('button', { name: 'Subscribe' }).click()
    await expect(form.getByText(/You’re in/)).toBeVisible()
  })
  test('shows the server error state', async ({ page }) => {
    await page.route('**/api/newsletter', (r) => r.fulfill({ status: 500, body: '{}' }))
    await page.goto('/')
    const form = page.locator('footer form')
    await form.getByLabel('Email address').fill('reader@example.com')
    await form.getByRole('button', { name: 'Subscribe' }).click()
    await expect(form.getByText(/couldn’t subscribe you/)).toBeVisible()
  })
})

test.describe('contact sales', () => {
  test('summarises errors, then sends', async ({ page }) => {
    await page.goto('/contact-sales')
    await page.getByRole('button', { name: 'Send message' }).click()
    const summary = page.getByRole('alert').filter({ hasText: /Please fix/ })
    await expect(summary).toBeFocused()
    await page.getByLabel('Full name').fill('Ada Lovelace')
    await page.getByLabel('Work email').fill('ada@example.com')
    await page.getByLabel('Company').fill('Analytical Ltd')
    await page.getByLabel('Team size').selectOption('11-50')
    await page.getByLabel('What will you use Mimix for?').fill('Dubbing our training library into Spanish and Malay.')
    await page.getByLabel(/I agree/).check()
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByRole('heading', { name: /we’ve got it/ })).toBeVisible()
  })
})

test.describe('voice library filters', () => {
  test('mirror to the URL', async ({ page }) => {
    await gotoHydrated(page, '/voice-library')
    const before = await page.locator('[data-voice-card]').count()
    await page.getByLabel('Gender', { exact: true }).selectOption('female')
    await expect(page).toHaveURL(/gender=female/)
    expect(await page.locator('[data-voice-card]').count()).toBeLessThan(before)
  })
})
