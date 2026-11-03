import { changerSchema } from '@/lib/schemas/changer'
import { changeVoice } from '@/server/modules/changer'
import { publicJob } from '@/server/jobs'
import { actorOf, body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/voice-changer — re-voices an uploaded recording (upload purpose "media") with one of
 * your voices. Returns 202 with a job; when it succeeds, output.generationId points to the audio
 * (GET /api/v1/history/{id}). Charged per started minute of the source.
 */
export const POST = route({ permission: 'generate', scope: 'changer' }, async (req, auth) =>
  Response.json(publicJob(await changeVoice(actorOf(auth), await body(req, changerSchema))), { status: 202 }))
