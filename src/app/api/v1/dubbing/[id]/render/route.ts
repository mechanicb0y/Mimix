import { dubRenderSchema } from '@/lib/schemas/dubbing'
import { queueRender } from '@/server/modules/dubbing'
import { publicJob } from '@/server/jobs'
import { actorOf, body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/dubbing/{id}/render — re-voices one language after edits. 202 with a job.
 * Charges the characters of changed lines only (rerenderCredits in the project view).
 */
export const POST = route<{ id: string }>({ permission: 'generate', scope: 'dubbing' }, async (req, auth, { id }) => {
  const { language } = await body(req, dubRenderSchema)
  return Response.json(publicJob(await queueRender(actorOf(auth), id, language)), { status: 202 })
})
