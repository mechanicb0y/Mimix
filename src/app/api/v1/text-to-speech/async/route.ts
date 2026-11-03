import { ttsSchema } from '@/lib/schemas/tts'
import { queueSpeech } from '@/server/modules/tts'
import { actorOf, body, route } from '@/server/api/route'
import { publicJob } from '@/server/jobs'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/text-to-speech/async: the same take as /text-to-speech, run as a job (202). Follow
 * it at /api/v1/jobs/{id}; when it succeeds, output.generationId is the take in /api/v1/history.
 */
export const POST = route({ permission: 'generate', scope: 'tts' }, async (req, auth) => {
  const input = await body(req, ttsSchema)
  return Response.json(publicJob(await queueSpeech(actorOf(auth), input)), { status: 202 })
})
