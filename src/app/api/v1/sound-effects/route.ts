import { sfxSchema } from '@/lib/schemas/audio-tools'
import { soundEffect } from '@/server/modules/audio-tools'
import { actorOf, body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/sound-effects — one sound effect from a text prompt. */
export const POST = route({ permission: 'generate', scope: 'sfx' }, async (req, auth) =>
  Response.json(await soundEffect(actorOf(auth), await body(req, sfxSchema)), { status: 201 }))
