import { webhookCreateSchema } from '@/lib/schemas/developers'
import { createWebhook, listWebhooks } from '@/server/modules/developers'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** GET /api/v1/webhooks — endpoints and the events they receive. */
export const GET = route({ permission: 'manageWebhooks' }, async (_req, auth) => Response.json({ items: await listWebhooks(auth.workspaceId) }))

/** POST /api/v1/webhooks — adds an endpoint. The signing secret is in the response once. */
export const POST = route({ permission: 'manageWebhooks' }, async (req, auth) =>
  Response.json(await createWebhook(auth.workspaceId, auth.userId, await body(req, webhookCreateSchema)), { status: 201, headers: { 'Cache-Control': 'no-store' } }))
