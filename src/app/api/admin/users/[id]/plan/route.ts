import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { changePlanSchema, changeWorkspacePlan } from '@/server/admin/users'

export const dynamic = 'force-dynamic'

/** POST /api/admin/users/{id}/plan — set a workspace's plan without Stripe. */
export const POST = adminRoute<{ id: string }>({ permission: 'changePlan' }, async (req, actor, { id }) => {
  await changeWorkspacePlan(actor, id, await body(req, changePlanSchema))
  return new Response(null, { status: 204 })
})
