import { route } from '@/server/api/route'
import { apiError } from '@/server/api/errors'
import { deleteGeneration, generationView, getGeneration } from '@/server/generations'

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string }>({ permission: 'viewContent', scope: 'any' }, async (_req, auth, { id }) => {
  const g = await getGeneration(id, auth.workspaceId)
  return g ? Response.json(await generationView(g)) : apiError(404, 'not_found', 'Not found')
})

export const DELETE = route<{ id: string }>({ permission: 'generate', scope: 'any' }, async (_req, auth, { id }) => {
  return (await deleteGeneration(id, auth.workspaceId)) ? new Response(null, { status: 204 }) : apiError(404, 'not_found', 'Not found')
})
