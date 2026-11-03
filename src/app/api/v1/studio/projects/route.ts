import { studioCreateSchema } from '@/lib/schemas/studio'
import { createProject, listProjects } from '@/server/modules/studio'
import { actorOf, body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** GET /api/v1/studio/projects — most recently edited first. */
export const GET = route({ permission: 'viewContent', scope: 'studio' }, async (_req, auth) =>
  Response.json({ items: await listProjects(auth.workspaceId) }))

/** POST /api/v1/studio/projects — a new audiobook or podcast with one empty chapter. Pro plan and up. */
export const POST = route({ permission: 'generate', scope: 'studio' }, async (req, auth) =>
  Response.json(await createProject(actorOf(auth), await body(req, studioCreateSchema)), { status: 201 }))
