import { route } from '@/server/api/route'
import { setSaved } from '@/server/modules/voices'

export const dynamic = 'force-dynamic'

/** POST saves a public voice to My voices; DELETE removes it. */
export const POST = route<{ id: string }>({ permission: 'manageVoices', scope: 'voices:write' }, async (_req, auth, { id }) => { await setSaved(auth.workspaceId, id, true); return new Response(null, { status: 204 }) })
export const DELETE = route<{ id: string }>({ permission: 'manageVoices', scope: 'voices:write' }, async (_req, auth, { id }) => { await setSaved(auth.workspaceId, id, false); return new Response(null, { status: 204 }) })
