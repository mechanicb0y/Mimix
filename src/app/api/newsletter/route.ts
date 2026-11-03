import { BadRequest, deliverForm, readJson, sameOrigin } from '@/lib/forms'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { fieldErrors, newsletterSchema } from '@/lib/validation'

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const limit = rateLimit(clientKey(req, 'newsletter'), 5, 60_000)
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)
  try {
    const parsed = newsletterSchema.safeParse(await readJson(req, 2048))
    if (!parsed.success) return Response.json({ error: 'validation', fields: fieldErrors(parsed.error) }, { status: 422 })
    await deliverForm('newsletter', parsed.data)
    return Response.json({ ok: true })
  } catch (err) {
    if (err instanceof BadRequest) return Response.json({ error: err.code }, { status: err.status })
    console.error('[newsletter]', err)
    return Response.json({ error: 'server' }, { status: 500 })
  }
}
