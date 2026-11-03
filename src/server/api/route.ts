import 'server-only'
import type { z } from 'zod'
import { apiAuth, type ApiAuth } from '@/server/api/auth'
import { apiError, handleApiError, UserError } from '@/server/api/errors'
import { refreshPlans } from '@/server/plans'
import { getSetting } from '@/server/settings'
import { isStaff } from '@/config/admin'
import type { ApiScope } from '@/server/db/schema'
import type { Permission } from '@/server/workspaces'
import { getMessages } from '@/i18n'

export type Authed = Extract<ApiAuth, { ok: true }>
type Ctx<P> = { params: Promise<P> }

/**
 * Wraps an API handler: authenticates (session or API key), checks the permission and scope,
 * and turns thrown errors into the standard JSON error body.
 */
export function route<P = Record<string, string>>(
  opts: { permission: Permission; scope?: ApiScope | 'any'; /** Account pages: refuse API keys. */ sessionOnly?: boolean },
  handler: (req: Request, auth: Authed, params: P) => Promise<Response>,
) {
  return async (req: Request, ctx: Ctx<P>): Promise<Response> => {
    try {
      const auth = await apiAuth(req, opts.permission, opts.scope)
      if (!auth.ok) return auth.response
      await refreshPlans()
      // Maintenance mode: the API is closed to everyone but staff (brief section 8).
      if (!isStaff(auth.platformRole) && (await getSetting('maintenance'))?.active) {
        return apiError(503, 'maintenance', getMessages('en').errors.app.maintenance, {}, { 'Retry-After': '600' })
      }
      if (opts.sessionOnly && (auth.via !== 'session' || !auth.userId)) throw new UserError('session_only', getMessages('en').errors.app.sessionOnly, 403)
      const res = await handler(req, auth, (await ctx?.params) ?? ({} as P))
      for (const [k, v] of Object.entries(auth.rateHeaders)) res.headers.set(k, v)
      return res
    } catch (err) {
      return handleApiError(err)
    }
  }
}

/** Parses a JSON body with a schema (throws ZodError → 422 with field messages). */
export async function body<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let data: unknown
  try { data = await req.json() } catch { throw new UserError('invalid_json', 'The request body must be JSON.', 400) }
  return schema.parse(data)
}

export const actorOf = (a: Authed) => ({ workspaceId: a.workspaceId, userId: a.userId, apiKeyId: a.apiKeyId })
