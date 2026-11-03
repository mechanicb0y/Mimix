import { route } from '@/server/api/route'
import { getVoiceEngine } from '@/server/engine'

export const dynamic = 'force-dynamic'

/** GET /api/v1/models — models and capabilities of the active engine. */
export const GET = route({ permission: 'viewContent' }, async () => {
  const e = getVoiceEngine()
  return Response.json({ engine: e.id, preview: e.isMock, ...e.capabilities })
})
