import { mixSourcesSchema } from '@/lib/schemas/mixer'
import { previewMix } from '@/server/modules/mixer'
import { actorOf, body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/voices/mix/preview — free preview of a blend on the fixed sentence. Returns audio. */
export const POST = route({ permission: 'generate', scope: 'voices:write' }, async (req, auth) => {
  const audio = await previewMix(actorOf(auth), await body(req, mixSourcesSchema))
  return new Response(audio.audio as BodyInit, {
    headers: { 'Content-Type': audio.mimeType, 'Cache-Control': 'no-store', 'X-Duration-Ms': String(audio.durationMs) },
  })
})
