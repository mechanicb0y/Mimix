import { topUpSchema } from '@/lib/schemas/account'
import { startTopUp } from '@/server/modules/account'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/billing/top-up — { topUp }. Returns { url } for Stripe Checkout (paid plans only). */
export const POST = route({ permission: 'manageBilling', sessionOnly: true }, async (req, auth) =>
  Response.json(await startTopUp(auth.workspaceId, auth.userId!, (await body(req, topUpSchema)).topUp)))
