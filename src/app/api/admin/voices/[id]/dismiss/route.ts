import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { dismissSchema, dismissVoiceReports } from '@/server/admin/moderation'

export const dynamic = 'force-dynamic'

/** POST /api/admin/voices/{id}/dismiss — close the voice's open reports without action. */
export const POST = adminRoute<{ id: string }>({ permission: 'moderateVoices' }, async (req, actor, { id }) => {
  return Response.json(await dismissVoiceReports(actor, id, await body(req, dismissSchema)))
})
