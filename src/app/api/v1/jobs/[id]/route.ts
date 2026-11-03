import { route } from '@/server/api/route'
import { apiError } from '@/server/api/errors'
import { cancelJob, getJob, publicJob } from '@/server/jobs'

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string }>({ permission: 'viewContent' }, async (_req, auth, { id }) => {
  const j = await getJob(id, auth.workspaceId)
  return j ? Response.json(publicJob(j)) : apiError(404, 'not_found', 'Job not found')
})

/** DELETE cancels a queued or running job; its credits are refunded. */
export const DELETE = route<{ id: string }>({ permission: 'generate' }, async (_req, auth, { id }) =>
  (await cancelJob(id, auth.workspaceId)) ? new Response(null, { status: 204 }) : apiError(409, 'not_cancellable', 'This job has already finished.'))
