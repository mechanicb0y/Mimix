import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { adminTakedown, takedownSchema } from '@/server/admin/moderation'

export const dynamic = 'force-dynamic'

/** POST /api/admin/voices/{id}/takedown — the voice and every mix built from it stop working. */
export const POST = adminRoute<{ id: string }>({ permission: 'moderateVoices', destructive: true }, async (req, actor, { id }) => {
  return Response.json(await adminTakedown(actor, id, await body(req, takedownSchema)))
})
