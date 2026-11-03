import { revokeInvite } from '@/server/modules/team'
import { route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** DELETE /api/v1/team/invites/{id} — cancels an open invite and frees its seat. */
export const DELETE = route<{ id: string }>({ permission: 'manageMembers', sessionOnly: true }, async (_req, auth, { id }) => {
  await revokeInvite(auth.workspaceId, id, auth.userId!)
  return new Response(null, { status: 204 })
})
