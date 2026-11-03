import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { z } from '@/lib/zod'
import { PLAN_IDS } from '@/server/db/schema'
import { apiError } from '@/server/api/errors'
import { editPlan, planEditSchema, resetPlan } from '@/server/admin/platform'
import { getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'

const planId = (id: string) => (PLAN_IDS as readonly string[]).includes(id) ? (id as (typeof PLAN_IDS)[number]) : null
const notFound = () => apiError(404, 'not_found', getMessages('en').errors.app.notFound)

/** PUT /api/admin/plans/{id} — edit a plan; price changes create new Stripe prices. */
export const PUT = adminRoute<{ id: string }>({ permission: 'managePlans', destructive: true }, async (req, actor, { id }) => {
  const p = planId(id)
  if (!p) return notFound()
  return Response.json(await editPlan(actor, p, await body(req, planEditSchema)))
})

/** DELETE /api/admin/plans/{id} — back to the defaults. */
export const DELETE = adminRoute<{ id: string }>({ permission: 'managePlans', destructive: true }, async (req, actor, { id }) => {
  const p = planId(id)
  if (!p) return notFound()
  const { reason } = await body(req, z.object({ reason: z.string().trim().min(5, 'reason').max(500, 'reason') }))
  await resetPlan(actor, p, reason)
  return new Response(null, { status: 204 })
})
