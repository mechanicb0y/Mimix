import { roleSchema } from '@/lib/schemas/account'
import { changeRole, removeMember } from '@/server/modules/team'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** PATCH /api/v1/team/members/{userId} — changes a role. Only the owner can make or change admins. */
export const PATCH = route<{ userId: string }>({ permission: 'manageMembers', sessionOnly: true }, async (req, auth, { userId }) => {
  const { role } = await body(req, roleSchema)
  await changeRole(auth.workspaceId, { id: auth.userId!, role: auth.role }, userId, role)
  return new Response(null, { status: 204 })
})

/** DELETE /api/v1/team/members/{userId} — removes someone, or leaves when it's your own id. */
export const DELETE = route<{ userId: string }>({ permission: 'viewContent', sessionOnly: true }, async (_req, auth, { userId }) => {
  await removeMember(auth.workspaceId, { id: auth.userId!, role: auth.role }, userId)
  return new Response(null, { status: 204 })
})
