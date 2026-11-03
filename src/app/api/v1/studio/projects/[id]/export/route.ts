import { studioExportSchema } from '@/lib/schemas/studio'
import { queueExport } from '@/server/modules/studio'
import { publicJob } from '@/server/jobs'
import { actorOf, body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/studio/projects/{id}/export — voices any changed blocks (charged per character),
 * then builds loudness-normalised MP3s: one per chapter for audiobooks, one file for a podcast.
 * 202 with a job.
 */
export const POST = route<{ id: string }>({ permission: 'generate', scope: 'studio' }, async (req, auth, { id }) => {
  const { chapterId } = await body(req, studioExportSchema)
  return Response.json(publicJob(await queueExport(actorOf(auth), id, chapterId)), { status: 202 })
})
