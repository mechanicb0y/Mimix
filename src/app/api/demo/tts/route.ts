import { findVoice, DEMO_VOICE_IDS } from '@/config/voices'
import { BadRequest, readJson, sameOrigin } from '@/lib/forms'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { demoTtsSchema } from '@/lib/validation'
import { getVoiceEngine } from '@/lib/voice'

/** Live hero demo: short text, demo voices only, 20 plays per minute per visitor. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const limit = rateLimit(clientKey(req, 'demo-tts'), 20, 60_000)
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)
  try {
    const parsed = demoTtsSchema.safeParse(await readJson(req, 4096))
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'invalid' }, { status: 422 })
    const { text, voiceId } = parsed.data
    const voice = findVoice(voiceId)
    if (!voice || !(DEMO_VOICE_IDS as readonly string[]).includes(voiceId)) return Response.json({ error: 'unknown_voice' }, { status: 422 })
    const engine = getVoiceEngine()
    const result = await engine.synthesize({ text, voice: voice.params })
    return new Response(result.audio as BodyInit, {
      headers: {
        'Content-Type': result.mimeType,
        'Cache-Control': 'no-store',
        'X-Duration-Ms': String(result.durationMs),
        'X-Engine': engine.id,
      },
    })
  } catch (err) {
    if (err instanceof BadRequest) return Response.json({ error: err.code }, { status: err.status })
    console.error('[demo-tts]', err)
    return Response.json({ error: 'server' }, { status: 500 })
  }
}
