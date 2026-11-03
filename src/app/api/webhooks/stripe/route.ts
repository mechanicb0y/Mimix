import { handleStripeEvent, parseWebhook } from '@/server/billing'

export const dynamic = 'force-dynamic'

/** Stripe webhooks. Signature-checked, processed once per event id; a 500 makes Stripe retry. */
export async function POST(req: Request) {
  const payload = await req.text()
  let event
  try {
    event = parseWebhook(payload, req.headers.get('stripe-signature'))
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }
  try {
    const processed = await handleStripeEvent(event)
    return Response.json({ received: true, duplicate: !processed })
  } catch (err) {
    console.error('[stripe webhook]', event.type, event.id, err)
    return Response.json({ error: 'Processing failed' }, { status: 500 })
  }
}
