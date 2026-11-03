// @ts-expect-error plain ESM helper shared with scripts/db-server.mjs
import { startPglite } from '../../scripts/pglite-server.mjs'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { createServer } from 'node:net'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TestProject } from 'vitest/node'

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer()
    s.listen(0, '127.0.0.1', () => { const a = s.address(); s.close(() => (typeof a === 'object' && a ? resolve(a.port) : reject(new Error('no port')))) })
  })
}

/** Starts a throwaway in-memory Postgres (PGlite) for the integration run and applies migrations. */
export default async function setup(project: TestProject) {
  const port = await freePort()
  const pg = await startPglite({ port })
  const url: string = pg.url
  const sql = postgres(url, { max: 1, onnotice: () => {} })
  await migrate(drizzle(sql), { migrationsFolder: 'drizzle' })
  await sql.end()
  const dataDir = mkdtempSync(join(tmpdir(), 'mimix-test-'))
  project.provide('databaseUrl', url)
  project.provide('dataDir', dataDir)
  const stripe = await startStripeMock()
  project.provide('stripeApiBase', stripe.base)
  return async () => {
    stripe.proc?.kill()
    await pg.stop()
    rmSync(dataDir, { recursive: true, force: true })
  }
}

/**
 * stripe-mock (github.com/stripe/stripe-mock) for billing tests: STRIPE_MOCK_BIN, or stripe-mock on
 * PATH. Without it the tests that call Stripe are skipped and the webhook tests still run.
 */
async function startStripeMock(): Promise<{ base: string; proc?: ChildProcess }> {
  const bin = process.env.STRIPE_MOCK_BIN ?? (spawnSync('which', ['stripe-mock']).stdout?.toString().trim() || '')
  if (!bin || !existsSync(bin)) return { base: '' }
  const port = await freePort()
  const proc = spawn(bin, ['-http-port', String(port)], { stdio: 'ignore' })
  const base = `http://127.0.0.1:${port}`
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${base}/v1/customers`, { headers: { Authorization: 'Bearer sk_test_mock' } })).ok) return { base, proc } } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 100))
  }
  proc.kill()
  return { base: '' }
}

declare module 'vitest' {
  export interface ProvidedContext { databaseUrl: string; dataDir: string; stripeApiBase: string }
}
