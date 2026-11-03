import { test, expect } from './fixtures'
import { ROUTES } from './fixtures'

test.describe('mobile drawer', () => {
  test('traps focus, locks scroll and closes with Esc', async ({ page }) => {
    await page.goto('/')
    const open = page.getByRole('button', { name: 'Open menu' })
    await open.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden')
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(open).toBeFocused()
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden')
  })

  test('navigates and closes on link click', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('dialog').getByRole('link', { name: 'Pricing' }).click()
    await expect(page).toHaveURL(/\/pricing$/)
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('desktop nav is hidden below 1024px', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Products', exact: true })).toBeHidden()
  })

  for (const path of ROUTES) {
    test(`no horizontal scroll at 390px: ${path}`, async ({ page }) => {
      await page.goto(path)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    })
  }
})
