import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { setRoleSchema, setUserRole } from '@/server/admin/users'

export const dynamic = 'force-dynamic'

/** POST /api/admin/users/{id}/role — Owners only. */
export const POST = adminRoute<{ id: string }>({ permission: 'manageRoles', destructive: true }, async (req, actor, { id }) => {
  await setUserRole(actor, id, await body(req, setRoleSchema))
  return new Response(null, { status: 204 })
})
