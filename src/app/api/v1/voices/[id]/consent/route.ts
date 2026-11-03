import { consentSchema } from '@/lib/schemas/clone'
import { attestConsent, consentRecords, verifyConsent } from '@/server/modules/clone'
import { actorOf, body, route } from '@/server/api/route'
import { clientIp } from '@/server/api/auth'

export const dynamic = 'force-dynamic'

/** GET /api/v1/voices/{id}/consent — the voice's consent records: phrase, times, result and audio hash. */
export const GET = route<{ id: string }>({ permission: 'manageVoices', scope: 'voices:read' }, async (_req, auth, { id }) =>
  Response.json({ items: await consentRecords(auth.workspaceId, id) }))

/**
 * POST /api/v1/voices/{id}/consent — submits the speaker reading the phrase (an upload with purpose
 * "consent"). 200 when verified; 422 with a reason and a fresh phrase when not. With
 * CLONE_CONSENT=attest, `{ "attest": true }` confirms the uploader's right to the voice instead.
 */
export const POST = route<{ id: string }>({ permission: 'manageVoices', scope: 'voices:write' }, async (req, auth, { id }) => {
  const actor = { ...actorOf(auth), ipAddress: clientIp(req) }
  const input = await body(req, consentSchema)
  return Response.json('attest' in input ? await attestConsent(actor, id) : await verifyConsent(actor, id, input))
})
