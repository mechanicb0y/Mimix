import { createCloneSchema } from '@/lib/schemas/clone'
import { createClone } from '@/server/modules/clone'
import { actorOf, body, route } from '@/server/api/route'
import { clientIp } from '@/server/api/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/voices/clone — starts an instant or professional clone from uploaded samples
 * (see POST /api/v1/uploads with purpose "voice_sample"). Returns 202 with a job to follow; when it
 * succeeds the voice waits for the speaker's consent recording (with CLONE_CONSENT=attest it is
 * switched on straight away, on the uploader's confirmation).
 */
export const POST = route({ permission: 'manageVoices', scope: 'voices:write' }, async (req, auth) =>
  Response.json(await createClone({ ...actorOf(auth), ipAddress: clientIp(req) }, await body(req, createCloneSchema)), { status: 202 }))
