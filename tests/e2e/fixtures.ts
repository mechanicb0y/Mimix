import { test as base, expect } from '@playwright/test'

/**
 * Each test gets its own client address so the in-memory rate limits on the demo and form
 * endpoints never carry over between tests or repeated runs.
 */
export const test = base.extend({
  context: async ({ context }, provide) => {
    await context.setExtraHTTPHeaders({ 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250) + 1}-${Date.now()}` })
    await provide(context)
  },
})
export { expect }

export const ROUTES = [
  '/', '/voice-mixer', '/voice-library', '/pricing', '/developers', '/about', '/blog', '/blog/how-the-voice-mixer-works',
  '/contact-sales', '/help', '/legal/terms', '/legal/privacy', '/legal/acceptable-use', '/legal/voice-cloning-policy',
  ...['text-to-speech', 'voice-cloning', 'voice-design', 'voice-changer', 'speech-to-text', 'dubbing', 'sound-effects', 'voice-isolator', 'studio'].map((s) => `/products/${s}`),
  ...['creators', 'podcasts', 'education', 'games', 'business'].map((s) => `/use-cases/${s}`),
]

/** Waits until React has hydrated: RevealController arms the page once it runs (motion allowed). */
export async function gotoHydrated(page: import('@playwright/test').Page, path: string) {
  await page.goto(path)
  await page.locator('html.reveal-armed').waitFor({ state: 'attached' })
}
