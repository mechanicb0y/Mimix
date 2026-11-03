import { blockPatchSchema } from '@/lib/schemas/studio'
import { deleteBlock, patchBlock } from '@/server/modules/studio'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** PATCH /api/v1/studio/blocks/{id} — text, speaker or a one-off voice. Changing any of them marks the block for re-voicing. */
export const PATCH = route<{ id: string }>({ permission: 'generate', scope: 'studio' }, async (req, auth, { id }) =>
  Response.json(await patchBlock(auth.workspaceId, id, await body(req, blockPatchSchema))))

export const DELETE = route<{ id: string }>({ permission: 'generate', scope: 'studio' }, async (_req, auth, { id }) => {
  await deleteBlock(auth.workspaceId, id)
  return new Response(null, { status: 204 })
})
