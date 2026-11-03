import { apiError, handleApiError } from '@/server/api/errors'
import { body } from '@/server/api/route'
import { clientIp } from '@/server/api/auth'
import { completeSetup, setupSchema } from '@/server/admin/setup'
import { sameOrigin } from '@/lib/forms'
import { getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'

/** POST /api/admin/setup — the super-admin chooses a password with the one-time ADMIN_SETUP_TOKEN. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return apiError(403, 'forbidden', getMessages('en').errors.app.forbidden)
  try {
    await completeSetup(await body(req, setupSchema), clientIp(req))
    return new Response(null, { status: 204 })
  } catch (err) {
    return handleApiError(err)
  }
}
