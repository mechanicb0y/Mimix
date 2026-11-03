import { randomBytes } from 'node:crypto'
import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests run against a production build (`next build && next start`) on port 3200.
 * Set E2E_BASE_URL to test a running server instead, for example a dev server or a preview deploy.
 */
const PORT = 3200
const external = process.env.E2E_BASE_URL
// Shared with the test workers (they inherit this process's environment), so a test can sign the
// Stripe webhook that follows Checkout, as Stripe would in test mode.
process.env.E2E_STRIPE_WEBHOOK_SECRET ??= `whsec_${randomBytes(24).toString('hex')}`

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: external ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec/ },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true }, testMatch: /mobile\.spec/ },
  ],
  webServer: external ? undefined : {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ENABLE_TEST_ROUTES: '1', VOICE_ENGINE: 'mock', FORMS_DELIVERY: 'log', APP_URL: `http://localhost:${PORT}`,
      // A production build refuses development secrets, so each run gets throwaway ones.
      BETTER_AUTH_SECRET: randomBytes(32).toString('base64'), STORAGE_SIGNING_KEY: randomBytes(32).toString('base64'),
      APP_ENCRYPTION_KEY: randomBytes(32).toString('base64'), STRIPE_WEBHOOK_SECRET: process.env.E2E_STRIPE_WEBHOOK_SECRET,
      ...(process.env.STRIPE_API_BASE ? { STRIPE_API_BASE: process.env.STRIPE_API_BASE } : {}),
    },
  },
})
