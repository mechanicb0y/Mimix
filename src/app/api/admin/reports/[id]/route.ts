import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { decideReport, reportDecisionSchema } from '@/server/admin/moderation'

export const dynamic = 'force-dynamic'

/** POST /api/admin/reports/{id} — mark a report actioned or dismissed. */
export const POST = adminRoute<{ id: string }>({ permission: 'moderateGenerations' }, async (req, actor, { id }) => {
  await decideReport(actor, id, await body(req, reportDecisionSchema))
  return new Response(null, { status: 204 })
})
