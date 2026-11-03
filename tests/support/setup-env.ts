import { inject } from 'vitest'

Object.assign(process.env, {
  DATABASE_URL: inject('databaseUrl'),
  MIMIX_DATA_DIR: inject('dataDir'),
  NODE_ENV: 'test',
  APP_URL: 'http://localhost:3000',
  ADMIN_EMAIL: 'owner@example.test',
  ADMIN_SETUP_TOKEN: 'test-setup-token-0123456789abcdef0123456789',
  DATABASE_POOL_MAX: '5',
  STRIPE_SECRET_KEY: 'sk_test_mock',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
  ...(inject('stripeApiBase') ? { STRIPE_API_BASE: inject('stripeApiBase') } : {}),
})
