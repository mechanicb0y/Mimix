import { designSchema } from '@/lib/schemas/design'
import { designVoices } from '@/server/modules/design'
import { actorOf, body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/voices/design — three candidate voices from a description, each with a preview. */
export const POST = route({ permission: 'generate', scope: 'voices:write' }, async (req, auth) =>
  Response.json(await designVoices(actorOf(auth), await body(req, designSchema)), { status: 201 }))
