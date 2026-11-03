import { sttSchema } from '@/lib/schemas/audio-tools'
import { transcribe } from '@/server/modules/audio-tools'
import { publicJob } from '@/server/jobs'
import { actorOf, body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/speech-to-text — transcribes an upload (purpose "media") with timestamps and speaker
 * labels. 202 with a job; output.generationId is the transcript id (GET /api/v1/transcripts/{id}).
 */
export const POST = route({ permission: 'generate', scope: 'stt' }, async (req, auth) =>
  Response.json(publicJob(await transcribe(actorOf(auth), await body(req, sttSchema))), { status: 202 }))
