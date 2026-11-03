import { studioPatchSchema } from '@/lib/schemas/studio'
import { deleteProject, patchProject, projectView } from '@/server/modules/studio'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** GET /api/v1/studio/projects/{id} — chapters, blocks (with status and audio), cast and latest exports. */
export const GET = route<{ id: string }>({ permission: 'viewContent', scope: 'studio' }, async (_req, auth, { id }) =>
  Response.json(await projectView(auth.workspaceId, id)))

/** PATCH /api/v1/studio/projects/{id} — title, kind, default voice, cast. */
export const PATCH = route<{ id: string }>({ permission: 'generate', scope: 'studio' }, async (req, auth, { id }) =>
  Response.json(await patchProject(auth.workspaceId, id, await body(req, studioPatchSchema))))

export const DELETE = route<{ id: string }>({ permission: 'generate', scope: 'studio' }, async (_req, auth, { id }) => {
  await deleteProject(auth.workspaceId, id)
  return new Response(null, { status: 204 })
})
