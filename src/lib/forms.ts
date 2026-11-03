import 'server-only'

/**
 * Delivers form submissions. FORMS_DELIVERY=log (default) writes a redacted line to the server log,
 * which is what development and tests use. Phase 4 adds "resend" to email the sales inbox and to
 * add newsletter contacts, configured only through environment variables.
 */
export type FormKind = 'newsletter' | 'contact-sales'

export async function deliverForm(kind: FormKind, data: Record<string, unknown>): Promise<void> {
  const mode = process.env.FORMS_DELIVERY ?? 'log'
  if (mode === 'log') {
    const email = typeof data.email === 'string' ? data.email.replace(/^(.).*(@.*)$/, '$1***$2') : undefined
    console.info(`[forms] ${kind} received`, { email, fields: Object.keys(data) })
    return
  }
  throw new Error(`FORMS_DELIVERY "${mode}" is not available in this build`)
}

/** Reads a JSON body with a size cap so oversized requests are refused early. */
export async function readJson(req: Request, maxBytes = 16_384): Promise<unknown> {
  const type = req.headers.get('content-type') ?? ''
  if (!type.includes('application/json')) throw new BadRequest('unsupported_media_type', 415)
  const text = await req.text()
  if (text.length > maxBytes) throw new BadRequest('payload_too_large', 413)
  try { return JSON.parse(text) } catch { throw new BadRequest('invalid_json', 400) }
}

export class BadRequest extends Error {
  constructor(public code: string, public status = 400) { super(code) }
}

/** Refuses cross-site form posts: the Origin header must match the Host. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  try { return new URL(origin).host === req.headers.get('host') } catch { return false }
}
