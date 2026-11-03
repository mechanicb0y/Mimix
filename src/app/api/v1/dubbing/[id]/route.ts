import { dubPatchSchema } from '@/lib/schemas/dubbing'
import { deleteDub, dubView, getDub, patchDub } from '@/server/modules/dubbing'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** GET /api/v1/dubbing/{id} — the project with source lines, cast and every language's lines and files. */
export const GET = route<{ id: string }>({ permission: 'viewContent', scope: 'dubbing' }, async (_req, auth, { id }) =>
  Response.json(await dubView(await getDub(auth.workspaceId, id))))

/** PATCH /api/v1/dubbing/{id} — rename, recast speakers, or replace one language's lines. */
export const PATCH = route<{ id: string }>({ permission: 'generate', scope: 'dubbing' }, async (req, auth, { id }) =>
  Response.json(await patchDub(auth.workspaceId, id, await body(req, dubPatchSchema))))

/** DELETE /api/v1/dubbing/{id} — removes the project, its source and its rendered files. */
export const DELETE = route<{ id: string }>({ permission: 'generate', scope: 'dubbing' }, async (_req, auth, { id }) => {
  await deleteDub(auth.workspaceId, id)
  return new Response(null, { status: 204 })
})
