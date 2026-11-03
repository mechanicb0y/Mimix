import { z } from '@/lib/zod'
import { dubCreateSchema } from '@/lib/schemas/dubbing'
import { createDub, dubSummary, listDubs } from '@/server/modules/dubbing'
import { actorOf, body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

const q = z.object({ before: z.coerce.date().optional(), limit: z.coerce.number().int().min(1).max(100).default(20) })

/** GET /api/v1/dubbing — projects, newest first. */
export const GET = route({ permission: 'viewContent', scope: 'dubbing' }, async (req, auth) => {
  const p = q.parse(Object.fromEntries(new URL(req.url).searchParams))
  const rows = await listDubs(auth.workspaceId, p)
  return Response.json({ items: rows.map(dubSummary), nextBefore: rows.length === p.limit ? rows.at(-1)!.createdAt : null })
})

/**
 * POST /api/v1/dubbing — starts a project from an uploaded audio or video file (upload purpose
 * "media"). Returns 202 with the project and a job id; follow the job, then GET the project.
 * Charged per started minute, per target language, from the measured length.
 */
export const POST = route({ permission: 'generate', scope: 'dubbing' }, async (req, auth) => {
  const r = await createDub(actorOf(auth), await body(req, dubCreateSchema))
  return Response.json(r, { status: 202 })
})
