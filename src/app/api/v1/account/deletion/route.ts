import { deleteAccountSchema } from '@/lib/schemas/account'
import { cancelDeletion, deletionStatus, requestDeletion } from '@/server/modules/account'
import { userOf } from '@/server/api/user'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** GET /api/v1/account/deletion — whether deletion is scheduled, when, and what blocks it. */
export const GET = route({ permission: 'viewContent', sessionOnly: true }, async (_req, auth) => Response.json(await deletionStatus(auth.userId!)))

/** POST /api/v1/account/deletion — schedules deletion after the grace period. Body: { confirmEmail }. */
export const POST = route({ permission: 'viewContent', sessionOnly: true }, async (req, auth) => {
  const { confirmEmail } = await body(req, deleteAccountSchema)
  return Response.json(await requestDeletion(await userOf(auth.userId), confirmEmail))
})

/** DELETE /api/v1/account/deletion — cancels a scheduled deletion. */
export const DELETE = route({ permission: 'viewContent', sessionOnly: true }, async (_req, auth) => {
  await cancelDeletion(auth.userId!)
  return new Response(null, { status: 204 })
})
