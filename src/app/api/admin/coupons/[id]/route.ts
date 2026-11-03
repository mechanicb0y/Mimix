import { adminRoute } from '@/server/admin/guard'
import { deactivateCoupon } from '@/server/admin/platform'

export const dynamic = 'force-dynamic'

export const DELETE = adminRoute<{ id: string }>({ permission: 'managePlans', destructive: true }, async (_req, actor, { id }) => {
  await deactivateCoupon(actor, id)
  return new Response(null, { status: 204 })
})
