import { z } from '@/lib/zod'
import { transferOwnership } from '@/server/modules/team'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

const transferSchema = z.object({ userId: z.string({ error: 'required' }).min(1, 'required').max(64, 'required') })

/** POST /api/v1/team/transfer — the owner hands the workspace to an admin. Body: { userId }. */
export const POST = route({ permission: 'deleteWorkspace', sessionOnly: true }, async (req, auth) => {
  const { userId } = await body(req, transferSchema)
  await transferOwnership(auth.workspaceId, auth.userId!, userId)
  return new Response(null, { status: 204 })
})
