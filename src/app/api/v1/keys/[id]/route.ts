import { keyPatchSchema } from '@/lib/schemas/developers'
import { revokeKey, updateKey } from '@/server/modules/developers'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** PATCH /api/v1/keys/{id} — rename, or set or clear the monthly credit cap. */
export const PATCH = route<{ id: string }>({ permission: 'manageApiKeys' }, async (req, auth, { id }) =>
  Response.json(await updateKey(auth.workspaceId, id, await body(req, keyPatchSchema))))

/** DELETE /api/v1/keys/{id} — revokes the key immediately. */
export const DELETE = route<{ id: string }>({ permission: 'manageApiKeys' }, async (_req, auth, { id }) => {
  await revokeKey(auth.workspaceId, id, auth.userId)
  return new Response(null, { status: 204 })
})
