import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { couponSchema, createCoupon, listCoupons } from '@/server/admin/platform'

export const dynamic = 'force-dynamic'

export const GET = adminRoute({ permission: 'managePlans' }, async () => Response.json({ items: await listCoupons() }))

/** POST /api/admin/coupons — a Stripe coupon with a promotion code customers type at checkout. */
export const POST = adminRoute({ permission: 'managePlans' }, async (req, actor) => {
  return Response.json(await createCoupon(actor, await body(req, couponSchema)), { status: 201 })
})
