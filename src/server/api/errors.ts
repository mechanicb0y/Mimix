import 'server-only'
import { z } from '@/lib/zod'
import { InsufficientCreditsError } from '@/server/credits'
import { ForbiddenError } from '@/server/workspaces'
import { BillingError } from '@/server/billing'
import { getMessages, fmt } from '@/i18n'

/** A user-safe error with an HTTP status and a stable code. */
export class UserError extends Error {
  constructor(public code: string, message: string, public status = 400, public fields?: Record<string, string>, public extra?: Record<string, unknown>) { super(message); this.name = 'UserError' }
}

export type ApiErrorBody = { error: { code: string; message: string; fields?: Record<string, string>; [k: string]: unknown } }

export function apiError(status: number, code: string, message: string, extra: Record<string, unknown> = {}, headers?: HeadersInit): Response {
  return Response.json({ error: { code, message, ...extra } } satisfies ApiErrorBody, { status, headers })
}

/** zod issues → { field: message } using the first issue per field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const v = getMessages('en').app.validation as Record<string, string>
  const out: Record<string, string> = {}
  for (const i of error.issues) { const k = i.path.join('.') || '_'; out[k] ??= v[i.message] ?? v.required! }
  return out
}

/** Turns known errors into the standard JSON error; everything else is a logged 500. */
export function handleApiError(err: unknown): Response {
  const t = getMessages('en').errors.app
  if (err instanceof UserError) return apiError(err.status, err.code, err.message, { ...err.extra, ...(err.fields ? { fields: err.fields } : {}) })
  if (err instanceof z.ZodError) return apiError(422, 'validation_error', t.validation, { fields: fieldErrors(err) })
  if (err instanceof InsufficientCreditsError) return apiError(402, 'insufficient_credits', fmt(t.insufficientCredits, { needed: err.needed.toLocaleString('en-US'), available: err.available.toLocaleString('en-US') }), { needed: err.needed, available: err.available })
  if (err instanceof ForbiddenError) return apiError(403, 'forbidden', err.message)
  if (err instanceof BillingError) return apiError(400, err.code.toLowerCase(), err.message)
  if ((err as { name?: string })?.name === 'EngineError') return apiError((err as { status?: number }).status === 429 ? 503 : 502, 'engine_error', (err as Error).message)
  if ((err as { name?: string })?.name === 'AudioError') return apiError(422, 'audio_error', (err as Error).message)
  console.error('[api]', err)
  return apiError(500, 'server_error', t.server)
}
