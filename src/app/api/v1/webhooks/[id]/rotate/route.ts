import { rotateWebhookSecret } from '@/server/modules/developers'
import { route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/webhooks/{id}/rotate — replaces the signing secret; the old one stops working at once. */
export const POST = route<{ id: string }>({ permission: 'manageWebhooks' }, async (_req, auth, { id }) =>
  Response.json(await rotateWebhookSecret(auth.workspaceId, id, auth.userId), { headers: { 'Cache-Control': 'no-store' } }))
