#!/usr/bin/env node
/**
 * Local Postgres for development: PGlite over the Postgres wire protocol (see pglite-server.mjs).
 *   node scripts/db-server.mjs                 persistent, in .data/pglite, port 5433
 *   node scripts/db-server.mjs --memory 5434   throwaway database
 */
import { mkdirSync } from 'node:fs'
import { startPglite } from './pglite-server.mjs'

const memory = process.argv.includes('--memory')
const port = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? process.env.PGLITE_PORT ?? 5433)
if (!memory) mkdirSync('.data', { recursive: true })
const pg = await startPglite({ port, dataDir: memory ? 'memory://' : '.data/pglite' })
console.log(`Local Postgres (PGlite) on ${pg.url}${memory ? ' (in memory)' : ''}`)
const stop = async () => { await pg.stop(); process.exit(0) }
process.on('SIGINT', stop); process.on('SIGTERM', stop)
