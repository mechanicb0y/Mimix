import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // zod must come from src/lib/zod.ts, which turns off its eval probe (blocked by our CSP).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/zod.ts'],
    rules: { '@typescript-eslint/no-restricted-imports': ['error', { paths: [{ name: 'zod', message: "Import z from '@/lib/zod'.", allowTypeImports: true }] }] },
  },
  globalIgnores(['local/**', '.data/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'test-results/**', 'playwright-report/**']),
])
