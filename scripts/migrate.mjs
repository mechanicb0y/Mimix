#!/usr/bin/env node
/**
 * Applies drizzle/ migrations. Uses MIGRATE_DATABASE_URL when set (Supabase's direct connection,
 * port 5432: migrations need a session, not the transaction pooler), else DATABASE_URL, else the
 * local PGlite server. Safe to run on every deploy: applied migrations are skipped.
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const url = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5433/postgres'
const sql = postgres(url, { max: 1, onnotice: () => {} })
await migrate(drizzle(sql), { migrationsFolder: 'drizzle' })
console.log('Migrations applied')
await sql.end()
