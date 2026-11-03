import { z } from '@/lib/zod'
import { env } from '@/server/env'
import { route } from '@/server/api/route'
import { createJob, publicJob } from '@/server/jobs'

export const dynamic = 'force-dynamic'

/** End-to-end tests only (ENABLE_TEST_ROUTES=1): queues a slow job for the signed-in workspace. */
export const POST = route({ permission: 'generate' }, async (req, auth) => {
  if (!env().ENABLE_TEST_ROUTES) return new Response('Not found', { status: 404 })
  const input = z.object({ steps: z.number().int().min(1).max(40), title: z.string().max(60) }).parse(await req.json())
  const job = await createJob({ workspaceId: auth.workspaceId, userId: auth.userId, type: 'test_slow', input })
  return Response.json(publicJob(job), { status: 202 })
})
