import { chapterPatchSchema } from '@/lib/schemas/studio'
import { deleteChapter, patchChapter } from '@/server/modules/studio'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** PATCH /api/v1/studio/chapters/{id} — rename, or move up or down. Returns the project. */
export const PATCH = route<{ id: string }>({ permission: 'generate', scope: 'studio' }, async (req, auth, { id }) =>
  Response.json(await patchChapter(auth.workspaceId, id, await body(req, chapterPatchSchema))))

/** DELETE /api/v1/studio/chapters/{id} — removes a chapter and its blocks. Returns the project. */
export const DELETE = route<{ id: string }>({ permission: 'generate', scope: 'studio' }, async (_req, auth, { id }) =>
  Response.json(await deleteChapter(auth.workspaceId, id)))
