import { getMessages } from '@/i18n'
import { BadRequest, readJson, sameOrigin } from '@/lib/forms'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { demoMixSchema } from '@/lib/validation'
import { requireMixerOrNull } from '@/server/engine'
import { demoMixVoices } from '@/server/demo-mixer'

/** Voice Mixer preview: blends 2 or 3 remixable library voices and reads the fixed sample sentence. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const limit = rateLimit(clientKey(req, 'demo-mix'), 30, 60_000)
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)
  try {
    const parsed = demoMixSchema.safeParse(await readJson(req, 4096))
    if (!parsed.success) return Response.json({ error: 'invalid' }, { status: 422 })
    const ids = parsed.data.sources.map((s) => s.voiceId)
    if (new Set(ids).size !== ids.length) return Response.json({ error: 'duplicate' }, { status: 422 })
    const offered = demoMixVoices()
    const sources = parsed.data.sources.map((s) => ({ voice: offered.find((v) => v.id === s.voiceId), weight: s.weight }))
    if (sources.some((s) => !s.voice)) return Response.json({ error: 'not_remixable' }, { status: 422 })
    const engine = requireMixerOrNull()
    if (!engine) return Response.json({ error: 'unsupported' }, { status: 501 })
    const blended = await engine.mix({ sources: sources.map((s) => ({ voice: s.voice!.params, weight: s.weight, engineVoiceId: s.voice!.recipe })), adjust: parsed.data.adjust })
    const result = await engine.synthesize({ text: getMessages('en').mixer.playground.sentence, voice: blended.params, engineVoiceId: blended.engineVoiceId, seed: 'mixer' })
    return new Response(result.audio as BodyInit, {
      headers: { 'Content-Type': result.mimeType, 'Cache-Control': 'no-store', 'X-Duration-Ms': String(result.durationMs), 'X-Engine': engine.id },
    })
  } catch (err) {
    if (err instanceof BadRequest) return Response.json({ error: err.code }, { status: err.status })
    console.error('[demo-mix]', err)
    return Response.json({ error: 'server' }, { status: 500 })
  }
}
