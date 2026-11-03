import { z } from '@/lib/zod'
import { ledger } from '@/server/modules/account'
import { route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

const q = z.object({ before: z.coerce.date().optional() })

/** GET /api/v1/credits/ledger?before= — the workspace's credit history, newest first, 50 per page. */
export const GET = route({ permission: 'viewUsage', scope: 'usage:read' }, async (req, auth) => {
  const { before } = q.parse(Object.fromEntries(new URL(req.url).searchParams))
  return Response.json(await ledger(auth.workspaceId, before))
})
