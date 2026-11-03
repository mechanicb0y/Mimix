import { workspacePatchSchema } from '@/lib/schemas/account'
import { renameWorkspace } from '@/server/modules/team'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** PATCH /api/v1/workspace — renames the current workspace (owners and admins). */
export const PATCH = route({ permission: 'manageMembers', sessionOnly: true }, async (req, auth) => {
  await renameWorkspace(auth.workspaceId, auth.userId!, await body(req, workspacePatchSchema))
  return new Response(null, { status: 204 })
})
