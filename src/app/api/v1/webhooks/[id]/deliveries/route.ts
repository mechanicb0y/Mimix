import { listDeliveries } from '@/server/modules/developers'
import { route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** GET /api/v1/webhooks/{id}/deliveries — the last 50 deliveries with status and response codes. */
export const GET = route<{ id: string }>({ permission: 'manageWebhooks' }, async (_req, auth, { id }) => Response.json({ items: await listDeliveries(auth.workspaceId, id) }))
