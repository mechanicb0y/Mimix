import { issuePhrase } from '@/server/modules/clone'
import { actorOf, route } from '@/server/api/route'
import { clientIp } from '@/server/api/auth'

export const dynamic = 'force-dynamic'

/** POST /api/v1/voices/{id}/consent/phrase — a fresh random phrase for the speaker to read (valid 10 minutes). */
export const POST = route<{ id: string }>({ permission: 'manageVoices', scope: 'voices:write' }, async (req, auth, { id }) =>
  Response.json(await issuePhrase({ ...actorOf(auth), ipAddress: clientIp(req) }, id), { status: 201 }))
