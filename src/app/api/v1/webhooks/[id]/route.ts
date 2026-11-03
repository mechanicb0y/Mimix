import { webhookPatchSchema } from '@/lib/schemas/developers'
import { deleteWebhook, updateWebhook } from '@/server/modules/developers'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

export const PATCH = route<{ id: string }>({ permission: 'manageWebhooks' }, async (req, auth, { id }) =>
  Response.json(await updateWebhook(auth.workspaceId, id, await body(req, webhookPatchSchema))))

export const DELETE = route<{ id: string }>({ permission: 'manageWebhooks' }, async (_req, auth, { id }) => {
  await deleteWebhook(auth.workspaceId, id, auth.userId)
  return new Response(null, { status: 204 })
})
