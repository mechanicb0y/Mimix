import { requestPublish, unpublish, voiceView } from '@/server/modules/voices'
import { route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/voices/{id}/publish — ask to list the voice in the public library (moderated). */
export const POST = route<{ id: string }>({ permission: 'manageVoices', scope: 'voices:write' }, async (_req, auth, { id }) =>
  Response.json(await voiceView(await requestPublish(auth.workspaceId, id, auth.userId), { workspaceId: auth.workspaceId }), { status: 202 }))

/** DELETE /api/v1/voices/{id}/publish — remove it from the library, or withdraw the request. */
export const DELETE = route<{ id: string }>({ permission: 'manageVoices', scope: 'voices:write' }, async (_req, auth, { id }) =>
  Response.json(await voiceView(await unpublish(auth.workspaceId, id, auth.userId), { workspaceId: auth.workspaceId })))
