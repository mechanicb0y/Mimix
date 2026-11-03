import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { addBlocked, blockSchema } from '@/server/admin/moderation'

export const dynamic = 'force-dynamic'

/** POST /api/admin/blocklist — add a public figure whose voice may not be cloned, mixed or published. */
export const POST = adminRoute({ permission: 'moderateVoices' }, async (req, actor) => {
  return Response.json(await addBlocked(actor, await body(req, blockSchema)), { status: 201 })
})
