import { studioImportSchema } from '@/lib/schemas/studio'
import { importText } from '@/server/modules/studio'
import { body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/studio/projects/{id}/import — plain text or Markdown. Headings and "Chapter N" lines
 * start chapters, blank lines separate blocks, "NAME: line" sets a speaker.
 */
export const POST = route<{ id: string }>({ permission: 'generate', scope: 'studio' }, async (req, auth, { id }) =>
  Response.json(await importText(auth.workspaceId, id, await body(req, studioImportSchema))))
