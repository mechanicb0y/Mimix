import { checkoutSchema } from '@/lib/schemas/account'
import { startPlanChange } from '@/server/modules/account'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/billing/checkout — { plan, period }. Without a subscription, returns { url } for
 * Stripe Checkout; with one, changes the plan in place and returns { changed: true }.
 */
export const POST = route({ permission: 'manageBilling', sessionOnly: true }, async (req, auth) =>
  Response.json(await startPlanChange(auth.workspaceId, auth.userId!, await body(req, checkoutSchema))))
