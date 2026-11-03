import { portal } from '@/server/modules/account'
import { route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/billing/portal — returns { url } for the Stripe customer portal (card, address, tax ID). */
export const POST = route({ permission: 'manageBilling', sessionOnly: true }, async (_req, auth) => Response.json(await portal(auth.workspaceId)))
