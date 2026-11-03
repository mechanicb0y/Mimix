import { teamView } from '@/server/modules/team'
import { route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** GET /api/v1/team — members, open invites and the seat limit of the current workspace. */
export const GET = route({ permission: 'viewContent', sessionOnly: true }, async (_req, auth) => Response.json(await teamView(auth.workspaceId)))
