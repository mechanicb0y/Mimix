import { ttsSchema } from '@/lib/schemas/tts'
import { generateSpeech } from '@/server/modules/tts'
import { actorOf, body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/text-to-speech — one take. Returns the generation with signed audio URLs. */
export const POST = route({ permission: 'generate', scope: 'tts' }, async (req, auth) => {
  const input = await body(req, ttsSchema)
  return Response.json(await generateSpeech(actorOf(auth), input), { status: 201 })
})
