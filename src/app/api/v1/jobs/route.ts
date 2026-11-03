import { route } from '@/server/api/route'
import { listJobs } from '@/server/jobs'

export const dynamic = 'force-dynamic'

/** Finished jobs stay in the "recent" list this long, so the header can say they are done. */
const RECENT_MS = 15 * 60_000

/**
 * GET /api/v1/jobs: the workspace's running jobs, newest first.
 *   ?recent=1        also jobs that finished in the last 15 minutes
 *   ?type=stt,tts    only these job types
 *   ?ref=<id>        only jobs for this project or voice
 */
export const GET = route({ permission: 'viewContent' }, async (req, auth) => {
  const q = new URL(req.url).searchParams
  const types = q.get('type')?.split(',').map((s) => s.trim()).filter((s) => /^[a-z_]{2,32}$/.test(s)) ?? []
  const ref = q.get('ref') ?? undefined
  const limit = Number(q.get('limit') ?? 20)
  const items = await listJobs(auth.workspaceId, { recentMs: q.get('recent') === '1' ? RECENT_MS : undefined, types, ref: ref && /^[A-Za-z0-9_-]{1,64}$/.test(ref) ? ref : undefined, limit: Number.isFinite(limit) && limit > 0 ? limit : 20 })
  return Response.json({ items })
})
