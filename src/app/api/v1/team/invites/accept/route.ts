import { cookies } from 'next/headers'
import { acceptInviteSchema } from '@/lib/schemas/account'
import { acceptInvite } from '@/server/modules/team'
import { userOf } from '@/server/api/user'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/team/invites/accept — joins the workspace for the signed-in person and switches to it. */
export const POST = route({ permission: 'viewContent', sessionOnly: true }, async (req, auth) => {
  const { token } = await body(req, acceptInviteSchema)
  const r = await acceptInvite(token, await userOf(auth.userId))
  ;(await cookies()).set('mimix_ws', r.workspaceId, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 })
  return Response.json(r)
})
