import { route } from '@/server/api/route'
import { apiError } from '@/server/api/errors'
import { deleteRule } from '@/server/modules/tts'

export const dynamic = 'force-dynamic'

export const DELETE = route<{ id: string }>({ permission: 'generate', scope: 'tts' }, async (_req, auth, { id }) =>
  (await deleteRule(auth.workspaceId, id)) ? new Response(null, { status: 204 }) : apiError(404, 'not_found', 'Not found'))
