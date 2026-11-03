import { generateBlock } from '@/server/modules/studio'
import { actorOf, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/studio/blocks/{id}/generate — voices one block now; free if its audio is already current. */
export const POST = route<{ id: string }>({ permission: 'generate', scope: 'studio' }, async (_req, auth, { id }) =>
  Response.json(await generateBlock(actorOf(auth), id)))
