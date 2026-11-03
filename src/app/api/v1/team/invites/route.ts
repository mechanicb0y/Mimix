import { inviteSchema } from '@/lib/schemas/account'
import { invite } from '@/server/modules/team'
import { userOf } from '@/server/api/user'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/team/invites — emails an invite link (7 days). Uses a seat while open. */
export const POST = route({ permission: 'manageMembers', sessionOnly: true }, async (req, auth) => {
  const input = await body(req, inviteSchema)
  return Response.json(await invite(auth.workspaceId, await userOf(auth.userId), input), { status: 201 })
})
