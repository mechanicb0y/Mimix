import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { resetTwoFactor, resetTwoFactorSchema } from '@/server/admin/users'

export const dynamic = 'force-dynamic'

/** POST /api/admin/users/{id}/two-factor — turn off 2FA for a user who lost their device. */
export const POST = adminRoute<{ id: string }>({ permission: 'resetTwoFactor', destructive: true }, async (req, actor, { id }) => {
  await resetTwoFactor(actor, id, await body(req, resetTwoFactorSchema))
  return new Response(null, { status: 204 })
})
