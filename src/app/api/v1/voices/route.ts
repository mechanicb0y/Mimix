import { route } from '@/server/api/route'
import { listMyVoices } from '@/server/modules/voices'

export const dynamic = 'force-dynamic'

/** GET /api/v1/voices — the workspace's own voices and the public voices it saved. */
export const GET = route({ permission: 'viewContent', scope: 'voices:read' }, async (_req, auth) => Response.json(await listMyVoices(auth.workspaceId)))
