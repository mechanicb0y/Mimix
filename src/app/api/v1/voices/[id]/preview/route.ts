import { route } from '@/server/api/route'
import { apiError } from '@/server/api/errors'
import { getVisibleVoice, voicePreview } from '@/server/modules/voices'

export const dynamic = 'force-dynamic'

/** GET a short, free preview clip of a voice. */
export const GET = route<{ id: string }>({ permission: 'viewContent', scope: 'voices:read' }, async (_req, auth, { id }) => {
  const v = await getVisibleVoice(id, auth.workspaceId)
  if (!v || v.status !== 'active') return apiError(404, 'voice_not_found', 'Voice not found')
  const { bytes, mime } = await voicePreview(v)
  return new Response(Buffer.from(bytes), { headers: { 'Content-Type': mime, 'Cache-Control': 'private, max-age=3600' } })
})
