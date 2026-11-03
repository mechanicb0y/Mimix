import { PROVENANCE_MAX_BYTES } from '@/lib/schemas/safety'
import { publicProvenance } from '@/server/modules/safety'
import { hit } from '@/server/rate-limit'
import { clientKey } from '@/lib/rate-limit'
import { apiError, handleApiError } from '@/server/api/errors'
import { sameOrigin } from '@/lib/forms'
import { getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'

/**
 * POST /api/provenance — the public "made with Mimix?" check. Body: the audio file itself (any
 * content type), up to 25 MB. The file is read in memory and never stored. 20 checks per hour.
 */
export async function POST(req: Request) {
  const t = getMessages('en').errors.app
  if (!sameOrigin(req)) return apiError(403, 'forbidden', t.forbidden)
  const rl = await hit(clientKey(req, 'provenance'), 20, 3600)
  if (!rl.ok) return apiError(429, 'rate_limited', t.safety.rateLimited, {}, { 'Retry-After': String(rl.retryAfterSeconds) })
  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > PROVENANCE_MAX_BYTES) return apiError(413, 'too_large', t.safety.tooLarge)
  try {
    const bytes = new Uint8Array(await req.arrayBuffer())
    if (!bytes.length) return apiError(422, 'no_file', t.safety.noFile)
    if (bytes.length > PROVENANCE_MAX_BYTES) return apiError(413, 'too_large', t.safety.tooLarge)
    return Response.json(await publicProvenance(bytes))
  } catch (err) {
    return handleApiError(err)
  }
}
