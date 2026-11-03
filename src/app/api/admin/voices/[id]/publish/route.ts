import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { decidePublish, publishDecisionSchema } from '@/server/admin/moderation'

export const dynamic = 'force-dynamic'

/** POST /api/admin/voices/{id}/publish — approve or reject a request to list a voice in the library. */
export const POST = adminRoute<{ id: string }>({ permission: 'moderateVoices' }, async (req, actor, { id }) => {
  await decidePublish(actor, id, await body(req, publishDecisionSchema))
  return new Response(null, { status: 204 })
})
