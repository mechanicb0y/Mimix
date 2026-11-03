import { body, route } from '@/server/api/route'
import { apiError } from '@/server/api/errors'
import { deleteVoice, getVisibleVoice, updateVoice, voiceView } from '@/server/modules/voices'
import { voicePatchSchema } from '@/lib/schemas/voices'
import { lineageOf } from '@/server/modules/mixer'

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string }>({ permission: 'viewContent', scope: 'voices:read' }, async (_req, auth, { id }) => {
  const v = await getVisibleVoice(id, auth.workspaceId)
  if (!v) return apiError(404, 'voice_not_found', 'Voice not found')
  return Response.json({ ...(await voiceView(v, { workspaceId: auth.workspaceId })), lineage: v.kind === 'mixed' ? await lineageOf(v.id) : [] })
})

export const PATCH = route<{ id: string }>({ permission: 'manageVoices', scope: 'voices:write' }, async (req, auth, { id }) => {
  const v = await updateVoice(auth.workspaceId, id, await body(req, voicePatchSchema))
  return Response.json(await voiceView(v, { workspaceId: auth.workspaceId }))
})

export const DELETE = route<{ id: string }>({ permission: 'manageVoices', scope: 'voices:write' }, async (_req, auth, { id }) =>
  Response.json(await deleteVoice(auth.workspaceId, id, auth.userId)))
