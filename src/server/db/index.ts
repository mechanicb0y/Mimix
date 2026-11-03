import 'server-only'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/server/env'
import * as schema from './schema'

/**
 * One Postgres client per server process, created on first use (never at import, so `next build`
 * needs no database). Locally DATABASE_URL points at PGlite served over the Postgres wire protocol
 * (`npm run db`); in production it points at Supabase.
 */
export type Db = PostgresJsDatabase<typeof schema>
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

const g = globalThis as unknown as { mimixSql?: postgres.Sql; mimixDb?: Db }

export function getSql(): postgres.Sql {
  if (!g.mimixSql) {
    const url = env().DATABASE_URL
    g.mimixSql = postgres(url, {
      max: env().DATABASE_POOL_MAX,
      // Named prepared statements are off: Supabase's transaction pooler does not support them, and
      // the local PGlite server shares one backend between connections, where names would collide.
      prepare: env().DATABASE_PREPARE,
      onnotice: () => {},
    })
  }
  return g.mimixSql
}

export function getDb(): Db {
  if (!g.mimixDb) g.mimixDb = drizzle(getSql(), { schema })
  return g.mimixDb
}

export { schema }
