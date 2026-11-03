import { usageQuerySchema } from '@/lib/schemas/developers'
import { usage } from '@/server/modules/developers'
import { getBalance } from '@/server/credits'
import { route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/usage?from=&to=&apiKeyId= — credits and requests per UTC day and per product, totals
 * per API key, and the current balance. Defaults to the last 30 days.
 */
export const GET = route({ permission: 'viewUsage', scope: 'usage:read' }, async (req, auth) => {
  const q = usageQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams))
  return Response.json({ balance: await getBalance(auth.workspaceId), ...(await usage(auth.workspaceId, q)) })
})
