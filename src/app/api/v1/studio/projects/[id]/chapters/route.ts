import { chapterCreateSchema } from '@/lib/schemas/studio'
import { createChapter } from '@/server/modules/studio'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/studio/projects/{id}/chapters — adds a chapter (after afterId, or at the end). */
export const POST = route<{ id: string }>({ permission: 'generate', scope: 'studio' }, async (req, auth, { id }) =>
  Response.json(await createChapter(auth.workspaceId, id, await body(req, chapterCreateSchema)), { status: 201 }))
