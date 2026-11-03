import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  // `server-only` throws outside a React Server Components bundle; tests run plain Node.
  'server-only': fileURLToPath(new URL('./tests/support/empty.ts', import.meta.url)),
}

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      { resolve: { alias }, test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' } },
      {
        resolve: { alias },
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          globalSetup: ['tests/support/global-db.ts'],
          setupFiles: ['tests/support/setup-env.ts'],
          // One database for the whole run; files run one after another so balances are predictable.
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
})
