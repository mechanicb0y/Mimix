import { reportSchema } from '@/lib/schemas/safety'
import { fileReport } from '@/server/modules/safety'
import { getSession } from '@/server/session'
import { hit } from '@/server/rate-limit'
import { clientKey } from '@/lib/rate-limit'
import { apiError, fieldErrors, handleApiError } from '@/server/api/errors'
import { BadRequest, readJson, sameOrigin } from '@/lib/forms'
import { getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'

/** POST /api/reports — public abuse report (signed in or not). 10 per hour per address. */
export async function POST(req: Request) {
  const t = getMessages('en').errors.app
  if (!sameOrigin(req)) return apiError(403, 'forbidden', t.forbidden)
  const rl = await hit(clientKey(req, 'report'), 10, 3600)
  if (!rl.ok) return apiError(429, 'rate_limited', t.safety.rateLimited, {}, { 'Retry-After': String(rl.retryAfterSeconds) })
  try {
    const parsed = reportSchema.safeParse(await readJson(req, 16_384))
    if (!parsed.success) return apiError(422, 'validation', t.validation, { fields: fieldErrors(parsed.error) })
    if (parsed.data.website) return Response.json({ id: 'rpt_received' }, { status: 201 }) // honeypot: bots learn nothing
    const s = await getSession()
    return Response.json(await fileReport(parsed.data, { userId: s?.user.id ?? null, email: s?.user.email ?? null }), { status: 201 })
  } catch (err) {
    if (err instanceof BadRequest) return apiError(err.status, err.code, t.validation)
    return handleApiError(err)
  }
}
