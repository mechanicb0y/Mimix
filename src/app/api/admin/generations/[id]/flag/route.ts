import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { flagSchema, setGenerationFlag } from '@/server/admin/moderation'

export const dynamic = 'force-dynamic'

export const POST = adminRoute<{ id: string }>({ permission: 'moderateGenerations' }, async (req, actor, { id }) => {
  await setGenerationFlag(actor, id, await body(req, flagSchema))
  return new Response(null, { status: 204 })
})
