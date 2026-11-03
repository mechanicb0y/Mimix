import { timingSafeEqual } from 'node:crypto'
import { runSweeps } from '@/server/sweeps'
import { env } from '@/server/env'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * GET /api/cron/sweep — scheduled housekeeping for hosts without a long-running worker (Vercel Cron,
 * see vercel.json). Needs `Authorization: Bearer <CRON_SECRET>`; without CRON_SECRET it is off.
 */
export async function GET(req: Request) {
  const secret = env().CRON_SECRET
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return new Response(null, { status: 401 })
  return Response.json(await runSweeps())
}
