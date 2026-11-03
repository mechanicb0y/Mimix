import { isolatorSchema } from '@/lib/schemas/audio-tools'
import { isolate } from '@/server/modules/audio-tools'
import { publicJob } from '@/server/jobs'
import { actorOf, body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/voice-isolator — removes background noise and music from an upload. 202 with a job. */
export const POST = route({ permission: 'generate', scope: 'isolator' }, async (req, auth) =>
  Response.json(publicJob(await isolate(actorOf(auth), await body(req, isolatorSchema))), { status: 202 }))
