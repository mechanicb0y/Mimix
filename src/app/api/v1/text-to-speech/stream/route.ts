import { ttsSchema, ttsCredits, applyPronunciation } from '@/lib/schemas/tts'
import { actorOf, body, route } from '@/server/api/route'
import { engineForVoice, engineVoiceIdFor, modelFor } from '@/server/engine'
import { paramsOf, resolveVoiceForUse } from '@/server/voices'
import { failGeneration, startGeneration } from '@/server/generations'
import { listRules } from '@/server/modules/tts'
import { getDb, schema } from '@/server/db'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/text-to-speech/stream — audio bytes as they are produced (chunked transfer).
 * Credits are charged up front and refunded if the engine fails before the first byte.
 * Streamed audio is not stored; use the non-streaming endpoint to keep it in history.
 */
export const POST = route({ permission: 'generate', scope: 'tts' }, async (req, auth) => {
  const input = await body(req, ttsSchema)
  const voice = await resolveVoiceForUse(input.voiceId, auth.workspaceId)
  const engine = engineForVoice(voice)
  const model = modelFor(engine, input.model)
  const text = applyPronunciation(input.text, input.pronunciation ? await listRules(auth.workspaceId) : [])
  const g = await startGeneration(actorOf(auth), { module: 'tts', units: input.text.length, credits: ttsCredits(input.text), voiceId: voice.id, model, input: { text: input.text, settings: input.settings, streamed: true } })
  const iter = engine.stream({ text, voice: paramsOf(voice), engineVoiceId: engineVoiceIdFor(voice, engine), model, settings: input.settings, seed: input.seed ?? g.id })[Symbol.asyncIterator]()
  let first: IteratorResult<Uint8Array>
  try { first = await iter.next() } catch (err) { await failGeneration(g, (err as Error).message); throw err }
  const stream = new ReadableStream<Uint8Array>({
    start(c) { if (!first.done) c.enqueue(first.value); if (first.done) c.close() },
    async pull(c) {
      try {
        const n = await iter.next()
        if (n.done) { c.close(); await getDb().update(schema.generation).set({ status: 'succeeded' }).where(eq(schema.generation.id, g.id)); return }
        c.enqueue(n.value)
      } catch (err) { c.error(err) }
    },
    async cancel() { await iter.return?.() },
  })
  return new Response(stream, { headers: { 'Content-Type': engine.streamMimeType, 'X-Generation-Id': g.id, 'Cache-Control': 'no-store' } })
})
