import { designSaveSchema } from '@/lib/schemas/design'
import { saveDesignedVoice } from '@/server/modules/design'
import { actorOf, body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/voices/design/save — saves one candidate as a voice in the workspace. */
export const POST = route({ permission: 'manageVoices', scope: 'voices:write' }, async (req, auth) =>
  Response.json(await saveDesignedVoice(actorOf(auth), await body(req, designSaveSchema)), { status: 201 }))
