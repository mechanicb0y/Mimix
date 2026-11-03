import 'server-only'
import { sql } from 'drizzle-orm'
import { getDb } from '@/server/db'

/**
 * Fixed-window rate limit shared by every server instance (a row per key in rate_limit).
 * One atomic upsert per call: it starts a new window when the old one has passed.
 */
export async function hit(key: string, limit: number, windowSeconds: number): Promise<{ ok: boolean; remaining: number; retryAfterSeconds: number }> {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const rows = await getDb().execute<{ count: number; last_request: string }>(sql`
    insert into rate_limit (id, key, count, last_request) values (${`rl_${key}`}, ${key}, 1, ${now})
    on conflict (key) do update set
      count = case when rate_limit.last_request <= ${now - windowMs} then 1 else rate_limit.count + 1 end,
      last_request = case when rate_limit.last_request <= ${now - windowMs} then ${now} else rate_limit.last_request end
    returning count, last_request`)
  const row = rows[0]!
  const count = Number(row.count)
  const ok = count <= limit
  return { ok, remaining: Math.max(0, limit - count), retryAfterSeconds: ok ? 0 : Math.max(1, Math.ceil((Number(row.last_request) + windowMs - now) / 1000)) }
}
