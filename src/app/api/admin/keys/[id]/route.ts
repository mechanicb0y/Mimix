import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { keyEditSchema, revokeKey, revokeSchema, setKeyRateLimit } from '@/server/admin/platform'

export const dynamic = 'force-dynamic'

/** PATCH /api/admin/keys/{id} — change a key's per-minute rate limit. */
export const PATCH = adminRoute<{ id: string }>({ permission: 'manageDevelopers' }, async (req, actor, { id }) => {
  await setKeyRateLimit(actor, id, await body(req, keyEditSchema))
  return new Response(null, { status: 204 })
})

/** DELETE /api/admin/keys/{id} — revoke a key at once. */
export const DELETE = adminRoute<{ id: string }>({ permission: 'manageDevelopers', destructive: true }, async (req, actor, { id }) => {
  await revokeKey(actor, id, await body(req, revokeSchema))
  return new Response(null, { status: 204 })
})
