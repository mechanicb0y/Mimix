import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { adjustCredits, adjustCreditsSchema } from '@/server/admin/users'

export const dynamic = 'force-dynamic'

/** POST /api/admin/users/{id}/credits — add or remove credits, with a reason. */
export const POST = adminRoute<{ id: string }>({ permission: 'adjustCredits' }, async (req, actor, { id }) => {
  const balance = await adjustCredits(actor, id, await body(req, adjustCreditsSchema))
  return Response.json({ balance })
})
