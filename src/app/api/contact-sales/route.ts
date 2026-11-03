import { BadRequest, deliverForm, readJson, sameOrigin } from '@/lib/forms'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { contactSalesSchema, fieldErrors } from '@/lib/validation'

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const limit = rateLimit(clientKey(req, 'contact-sales'), 5, 10 * 60_000)
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)
  try {
    const parsed = contactSalesSchema.safeParse(await readJson(req, 8192))
    if (!parsed.success) return Response.json({ error: 'validation', fields: fieldErrors(parsed.error) }, { status: 422 })
    // Honeypot filled: accept silently so bots learn nothing, but don't deliver.
    if (parsed.data.website) return Response.json({ ok: true })
    const { website: _website, ...data } = parsed.data
    void _website
    await deliverForm('contact-sales', data)
    return Response.json({ ok: true })
  } catch (err) {
    if (err instanceof BadRequest) return Response.json({ error: err.code }, { status: err.status })
    console.error('[contact-sales]', err)
    return Response.json({ error: 'server' }, { status: 500 })
  }
}
