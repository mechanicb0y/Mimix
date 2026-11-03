import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { apiError } from '@/server/api/errors'
import { adminCan } from '@/config/admin'
import { setStatusSchema, setUserStatus } from '@/server/admin/users'
import { getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'

/** POST /api/admin/users/{id}/status — suspend, ban or restore. Banning (and lifting a ban) needs banUsers. */
export const POST = adminRoute<{ id: string }>({ permission: 'suspendUsers', destructive: true }, async (req, actor, { id }) => {
  const input = await body(req, setStatusSchema)
  const { getDb, schema } = await import('@/server/db')
  const { eq } = await import('drizzle-orm')
  const [u] = await getDb().select({ status: schema.user.status }).from(schema.user).where(eq(schema.user.id, id))
  if ((input.status === 'banned' || u?.status === 'banned') && !adminCan(actor.role, 'banUsers')) return apiError(403, 'forbidden', getMessages('en').errors.admin.forbidden)
  await setUserStatus(actor, id, input)
  return new Response(null, { status: 204 })
})
