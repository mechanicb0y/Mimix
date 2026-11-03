#!/usr/bin/env node
/**
 * Vercel runs `npm run vercel-build` instead of `npm run build` when it exists.
 * Production and the `staging` branch apply database migrations first (MIGRATE_DATABASE_URL, the
 * Supabase direct connection), so the code and the tables always ship together. Other preview
 * branches only build: they share the staging database and must not change it.
 */
import { execSync } from 'node:child_process'

const env = process.env.VERCEL_ENV
const branch = process.env.VERCEL_GIT_COMMIT_REF
const migrate = env === 'production' || (env === 'preview' && branch === 'staging')
if (migrate) {
  if (!process.env.MIGRATE_DATABASE_URL && !process.env.DATABASE_URL) throw new Error('Set MIGRATE_DATABASE_URL (Supabase direct connection) for this environment')
  console.log(`[vercel-build] applying migrations (${env}${branch ? `, ${branch}` : ''})`)
  execSync('node scripts/migrate.mjs', { stdio: 'inherit' })
} else {
  console.log(`[vercel-build] no migrations for ${env ?? 'local'}${branch ? ` (${branch})` : ''}`)
}
execSync('next build', { stdio: 'inherit' })
