import { cancelSchema } from '@/lib/schemas/account'
import { setCancel } from '@/server/modules/account'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/billing/cancel — { cancel: true } ends the plan at period end; false undoes that. */
export const POST = route({ permission: 'manageBilling', sessionOnly: true }, async (req, auth) => {
  await setCancel(auth.workspaceId, auth.userId!, (await body(req, cancelSchema)).cancel)
  return new Response(null, { status: 204 })
})
