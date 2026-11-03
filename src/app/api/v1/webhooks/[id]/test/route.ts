import { testWebhook } from '@/server/modules/developers'
import { route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/webhooks/{id}/test — sends a signed "ping" event now and reports the response code. */
export const POST = route<{ id: string }>({ permission: 'manageWebhooks' }, async (_req, auth, { id }) => Response.json(await testWebhook(auth.workspaceId, id)))
