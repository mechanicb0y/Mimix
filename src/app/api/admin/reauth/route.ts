import { z } from '@/lib/zod'
import { eq } from 'drizzle-orm'
import { body } from '@/server/api/route'
import { apiError, handleApiError } from '@/server/api/errors'
import { checkAdmin } from '@/server/admin/guard'
import { reauthenticate } from '@/server/admin/reauth'
import { getDb, schema } from '@/server/db'
import { getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'

const schemaIn = z.object({ password: z.string().min(1, 'required').max(256), code: z.string().trim().max(12).optional() })

/** POST /api/admin/reauth — unlocks an idle console and allows destructive actions for 5 minutes. */
export async function POST(req: Request) {
  try {
    const r = await checkAdmin(req.headers, { allowLocked: true, touch: false })
    if (!r.ok) {
      if (r.reason === 'two_factor') return apiError(403, 'two_factor_required', getMessages('en').errors.admin.twoFactorRequired)
      if (r.reason === 'signed_out') return apiError(401, 'unauthenticated', getMessages('en').errors.app.unauthenticated)
      return apiError(404, 'not_found', getMessages('en').errors.app.notFound)
    }
    const input = await body(req, schemaIn)
    const [u] = await getDb().select({ twoFactorEnabled: schema.user.twoFactorEnabled }).from(schema.user).where(eq(schema.user.id, r.actor.id))
    await reauthenticate({ ...r.actor, twoFactorEnabled: !!u?.twoFactorEnabled }, input)
    return new Response(null, { status: 204 })
  } catch (err) {
    return handleApiError(err)
  }
}
