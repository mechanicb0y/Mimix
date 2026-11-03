import { test, expect, gotoHydrated } from './fixtures'

test.describe('sticky header', () => {
  test('blurs after 8px of scroll and clears at the top', async ({ page }) => {
    await page.goto('/')
    const header = page.locator('header.site-header')
    await expect(header).toHaveAttribute('data-scrolled', 'false')
    await page.evaluate(() => window.scrollTo(0, 7))
    await page.waitForTimeout(100)
    await expect(header).toHaveAttribute('data-scrolled', 'false')
    await page.evaluate(() => window.scrollTo(0, 9))
    await expect(header).toHaveAttribute('data-scrolled', 'true')
    const blur = await header.evaluate((el) => getComputedStyle(el).backdropFilter)
    expect(blur).toContain('blur')
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(header).toHaveAttribute('data-scrolled', 'false')
  })

  test('skip link moves focus to main content', async ({ page }) => {
    await page.goto('/pricing')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: /skip to/i })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('main')).toBeFocused()
  })
})

test.describe('mega-menu', () => {
  const nav = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Main' })

  test('opens on hover only after the 150ms intent delay', async ({ page }) => {
    await gotoHydrated(page, '/')
    const trigger = nav(page).getByRole('button', { name: 'Products' })
    const box = await trigger.boundingBox()
    if (!box) throw new Error('trigger not visible')
    await page.mouse.move(box.x - 40, box.y + box.height / 2)
    const openedAfter = page.evaluate((id) => new Promise<number>((resolve) => {
      const el = document.getElementById(id)!
      const t0 = performance.now()
      new MutationObserver(() => { if (el.getAttribute('aria-expanded') === 'true') resolve(performance.now() - t0) })
        .observe(el, { attributes: true })
    }), (await trigger.getAttribute('id'))!)
    await page.mouse.move(box.x + 8, box.y + box.height / 2)
    expect(await openedAfter).toBeGreaterThanOrEqual(140)
    await expect(nav(page).getByRole('link', { name: /Text to Speech/ }).first()).toBeVisible()
  })

  test('opens on click, moves with arrow keys, closes with Esc and returns focus', async ({ page }) => {
    await page.goto('/')
    const trigger = nav(page).getByRole('button', { name: 'Products' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('ArrowDown')
    const first = await page.evaluate(() => document.activeElement?.textContent)
    expect(first).toBeTruthy()
    await page.keyboard.press('ArrowDown')
    const second = await page.evaluate(() => document.activeElement?.textContent)
    expect(second).not.toBe(first)
    await page.keyboard.press('ArrowUp')
    expect(await page.evaluate(() => document.activeElement?.textContent)).toBe(first)
    await page.keyboard.press('Escape')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toBeFocused()
  })

  test('each panel keeps its size and place, and stays open on the way from the trigger into it', async ({ page }) => {
    await gotoHydrated(page, '/')
    for (const name of ['Products', 'Solutions', 'Developers', 'Resources']) {
      await page.mouse.move(5, 600)
      const trigger = nav(page).getByRole('button', { name })
      const box = (await trigger.boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      const panel = page.locator('.mega-content[data-state="open"] .mega-panel')
      await expect(panel).toBeVisible()
      await page.waitForTimeout(400)
      const first = (await panel.boundingBox())!
      // Glide down from the trigger into the panel, then around inside it.
      const steps = [[box.x + box.width / 2, box.y + box.height + 4], [box.x + box.width / 2, first.y + 20], [first.x + first.width / 2, first.y + first.height / 2], [first.x + 30, first.y + first.height - 20]]
      for (const [x, y] of steps) {
        await page.mouse.move(x!, y!, { steps: 6 })
        await page.waitForTimeout(120)
        await expect(trigger).toHaveAttribute('aria-expanded', 'true')
        const now = (await panel.boundingBox())!
        expect(Math.abs(now.width - first.width)).toBeLessThan(1)
        expect(Math.abs(now.x - first.x)).toBeLessThan(1)
      }
      expect(first.x).toBeGreaterThanOrEqual(0)
      expect(first.x + first.width).toBeLessThanOrEqual(page.viewportSize()!.width)
      // Only opacity animates.
      const anim = await page.locator('.mega-content[data-state="open"]').evaluate((el) => getComputedStyle(el).transitionProperty + '|' + getComputedStyle(el.firstElementChild!).transitionProperty)
      expect(anim).not.toMatch(/width|left|transform/)
    }
  })

  test('click toggles the panel', async ({ page }) => {
    await page.goto('/')
    const trigger = nav(page).getByRole('button', { name: 'Resources' })
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })
})

test.describe('theme', () => {
  test('toggle switches theme and remembers it', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')
    const before = await html.getAttribute('data-theme')
    await page.getByRole('button', { name: /switch to (light|dark)/i }).first().click()
    await expect(html).not.toHaveAttribute('data-theme', before ?? '')
    const after = await html.getAttribute('data-theme')
    await page.reload()
    await expect(html).toHaveAttribute('data-theme', after ?? '')
  })
})
