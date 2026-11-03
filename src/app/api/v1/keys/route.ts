import { keyCreateSchema } from '@/lib/schemas/developers'
import { createKey, listKeys } from '@/server/modules/developers'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** GET /api/v1/keys — the workspace's keys (never the secret), with credits used this month. Owners and admins, signed in. */
export const GET = route({ permission: 'manageApiKeys' }, async (_req, auth) => Response.json({ items: await listKeys(auth.workspaceId) }))

/** POST /api/v1/keys — creates a key. The response holds the full key once; store it now. */
export const POST = route({ permission: 'manageApiKeys' }, async (req, auth) =>
  Response.json(await createKey(auth.workspaceId, auth.userId, await body(req, keyCreateSchema)), { status: 201, headers: { 'Cache-Control': 'no-store' } }))
