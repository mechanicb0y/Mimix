import { billingView } from '@/server/modules/account'
import { route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** GET /api/v1/billing — plan, status, credit balance and invoices for the current workspace. */
export const GET = route({ permission: 'viewUsage', sessionOnly: true }, async (_req, auth) => Response.json(await billingView(auth.workspaceId)))
