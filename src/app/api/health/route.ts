import { sql } from 'drizzle-orm'
import { getDb } from '@/server/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health — for uptime monitors. 200 when the app can reach its database, 503 when not.
 * Says nothing about configuration, versions or users.
 */
export async function GET() {
  const started = Date.now()
  try {
    await Promise.race([
      getDb().execute(sql`select 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ])
    return Response.json({ ok: true, db: 'ok', ms: Date.now() - started }, { headers: { 'cache-control': 'no-store' } })
  } catch {
    return Response.json({ ok: false, db: 'unreachable' }, { status: 503, headers: { 'cache-control': 'no-store' } })
  }
}
