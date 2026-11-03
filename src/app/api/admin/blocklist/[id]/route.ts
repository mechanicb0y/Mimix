import { adminRoute } from '@/server/admin/guard'
import { removeBlocked } from '@/server/admin/moderation'

export const dynamic = 'force-dynamic'

export const DELETE = adminRoute<{ id: string }>({ permission: 'moderateVoices', destructive: true }, async (_req, actor, { id }) => {
  await removeBlocked(actor, id)
  return new Response(null, { status: 204 })
})
