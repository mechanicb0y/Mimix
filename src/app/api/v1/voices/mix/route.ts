import { mixSaveSchema } from '@/lib/schemas/mixer'
import { saveMix } from '@/server/modules/mixer'
import { actorOf, body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/voices/mix — saves a blend as a new voice with lineage. Costs CREDIT_RATES.mixerSave. */
export const POST = route({ permission: 'manageVoices', scope: 'voices:write' }, async (req, auth) =>
  Response.json(await saveMix(actorOf(auth), await body(req, mixSaveSchema)), { status: 201 }))
