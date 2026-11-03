import { notificationPrefsSchema } from '@/lib/schemas/account'
import { getPrefs, setPrefs } from '@/server/modules/account'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** GET /api/v1/account/notifications — which emails the signed-in person gets. */
export const GET = route({ permission: 'viewContent', sessionOnly: true }, async (_req, auth) => Response.json(await getPrefs(auth.userId!)))

/** PATCH /api/v1/account/notifications — turns email types on or off. */
export const PATCH = route({ permission: 'viewContent', sessionOnly: true }, async (req, auth) =>
  Response.json(await setPrefs(auth.userId!, await body(req, notificationPrefsSchema))))
