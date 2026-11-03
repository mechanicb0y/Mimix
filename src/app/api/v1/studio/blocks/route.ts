import { blockCreateSchema } from '@/lib/schemas/studio'
import { createBlock } from '@/server/modules/studio'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/studio/blocks — adds a block to a chapter (after afterId, or at the end). */
export const POST = route({ permission: 'generate', scope: 'studio' }, async (req, auth) =>
  Response.json(await createBlock(auth.workspaceId, await body(req, blockCreateSchema)), { status: 201 }))
