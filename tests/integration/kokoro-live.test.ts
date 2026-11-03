import { describe, expect, it } from 'vitest'
import { KokoroEngine, voiceRecipe, formatRecipe, blendRecipes, parseRecipe } from '@/lib/voice/kokoro-engine'
import { speakerEmbedding } from '@/server/speaker'
import { wavDurationMs } from '@/server/audio'
import { getMessages } from '@/i18n'
import { ENGINE_LIMITS } from '@/config/engine-limits'
import { kokoroVoiceFor } from '@/config/kokoro-voices'

/**
 * Opt-in check against a running Kokoro mixer (engines/kokoro):
 *   KOKORO_LIVE_URL=http://localhost:8810 KOKORO_LIVE_TOKEN=... npx vitest run tests/integration/kokoro-live.test.ts
 * Renders the "mix, then clone" reference for a real blend and runs the instant-clone sample checks.
 */
const url = process.env.KOKORO_LIVE_URL
describe.skipIf(!url)('Kokoro mixer (live)', () => {
  it('renders a ~30 s mix reference that passes the instant-clone checks', async () => {
    const engine = new KokoroEngine({ url: url!, token: process.env.KOKORO_LIVE_TOKEN })
    const recipe = formatRecipe(blendRecipes([{ recipe: parseRecipe(voiceRecipe('af_heart'))!, weight: 0.5 }, { recipe: parseRecipe(voiceRecipe('am_michael'))!, weight: 0.5 }]))
    const out = await engine.synthesize({ text: getMessages('en').app.mixer.promoteScript, voice: { f0: 150, formantShift: 1, rate: 4.5, breathiness: 0.1, brightness: 0.5, expressiveness: 0.5 }, engineVoiceId: recipe })
    const total = wavDurationMs(out.audio)
    const voiced = speakerEmbedding(out.audio).voicedMs
    console.log(JSON.stringify({ recipe, totalSeconds: total / 1000, voicedSeconds: voiced / 1000 }))
    expect(total).toBeGreaterThan(24_000)
    expect(total).toBeLessThan(40_000)
    expect(voiced).toBeGreaterThan(ENGINE_LIMITS.cloneInstantMinSeconds.value * 1000)
  }, 120_000)

  // As the main engine (VOICE_ENGINE=kokoro). Start the server with KOKORO_FEATURES=isolate for the second half.
  it('speaks mapped library voices in their language and cleans noisy audio', async () => {
    const engine = new KokoroEngine({ url: url!, token: process.env.KOKORO_LIVE_TOKEN, main: true, features: ['isolate'] })
    const voice = { f0: 150, formantShift: 1, rate: 4.5, breathiness: 0.1, brightness: 0.5, expressiveness: 0.5 }
    for (const [id, text, language] of [['wren', 'Good morning from Mimix.', 'en'], ['elio', 'Hola, buenos días desde Mimix.', 'es']] as const) {
      const out = await engine.synthesize({ text, voice, engineVoiceId: voiceRecipe(kokoroVoiceFor(id)!), language })
      expect(wavDurationMs(out.audio)).toBeGreaterThan(800)
    }
    const speech = await engine.synthesize({ text: 'This sentence will be cleaned.', voice, engineVoiceId: voiceRecipe('af_heart') })
    const cleaned = await engine.isolate({ audio: speech.audio })
    expect(Math.abs(wavDurationMs(cleaned.audio) - wavDurationMs(speech.audio))).toBeLessThan(50)
  }, 120_000)

  it('speaks Mandarin and Japanese, and designs voices with audible pitch differences', async () => {
    const engine = new KokoroEngine({ url: url!, token: process.env.KOKORO_LIVE_TOKEN, main: true })
    const voice = { f0: 150, formantShift: 1, rate: 4.5, breathiness: 0.1, brightness: 0.5, expressiveness: 0.5 }
    for (const [k, text] of [['zf_xiaoxiao', '欢迎使用，今天天气很好。'], ['jm_kumo', '東京駅まで三十分かかります。']] as const) {
      const out = await engine.synthesize({ text, voice, engineVoiceId: voiceRecipe(k) })
      expect(wavDurationMs(out.audio)).toBeGreaterThan(1200)
    }
    const median = (wav: Uint8Array) => speakerEmbedding(wav).voicedMs
    const low = await engine.design({ description: 'A low, slow man.', previewText: 'Here is how I sound when I read to you.', language: 'en', traits: { gender: 'male', pitch: 'low', pace: 'slow' } })
    const high = await engine.design({ description: 'A high, quick woman.', previewText: 'Here is how I sound when I read to you.', language: 'en', traits: { gender: 'female', pitch: 'high', pace: 'fast' } })
    expect(low).toHaveLength(3)
    // Slower pace: the same line takes longer.
    expect(wavDurationMs(low[0]!.preview!.audio)).toBeGreaterThan(wavDurationMs(high[0]!.preview!.audio))
    expect(median(low[0]!.preview!.audio)).toBeGreaterThan(500)
  }, 120_000)
})

/**
 * Opt-in check of voice cloning against a Kokoro server started with KOKORO_FEATURES=clone:
 *   KOKORO_CLONE_URL=http://localhost:8812 KOKORO_LIVE_TOKEN=... npx vitest run tests/integration/kokoro-live.test.ts
 * The consent check's embeddings tell two Kokoro voices apart less sharply than two people (CAM++ is
 * trained on real speech), so this checks the shape and the ordering, not the pass mark.
 */
const cloneUrl = process.env.KOKORO_CLONE_URL
describe.skipIf(!cloneUrl)('Kokoro voice cloning (live)', () => {
  it('embeds speakers, clones from samples and speaks with the clone', async () => {
    const engine = new KokoroEngine({ url: cloneUrl!, token: process.env.KOKORO_LIVE_TOKEN, main: true, features: ['clone', 'transcribe'] })
    const voice = { f0: 150, formantShift: 1, rate: 4.5, breathiness: 0.1, brightness: 0.5, expressiveness: 0.5 }
    const say = (id: string, text: string) => engine.synthesize({ text, voice, engineVoiceId: voiceRecipe(id) }).then((r) => r.audio)
    const line = 'The quick brown fox jumps over the lazy dog, and then it runs back across the field to the old farmhouse.'
    const [a1, a2, b] = await Promise.all([say('am_michael', line), say('am_michael', 'Every morning I walk to the station, buy a newspaper and catch the early train.'), say('af_heart', line)])
    const ea1 = await engine.speakerEmbedding(a1); const ea2 = await engine.speakerEmbedding(a2); const eb = await engine.speakerEmbedding(b)
    expect(ea1.v).toHaveLength(512)
    expect(ea1.voicedMs).toBeGreaterThan(3000)
    const cos = (x: number[], y: number[]) => x.reduce((t, v, i) => t + v * y[i]!, 0)
    expect(cos(ea1.v, ea2.v)).toBeGreaterThan(cos(ea1.v, eb.v))

    const made = await engine.clone({ samples: [b, await say('af_heart', 'Every morning I walk to the station, buy a newspaper and catch the early train.')], name: 'Test', kind: 'instant', language: 'en' })
    const r = parseRecipe(made.engineVoiceId)!
    expect(r.tone).toMatch(/^[A-Za-z0-9_-]{683}$/)
    expect(Object.keys(r.weights)[0]).toMatch(/^af_/)
    const out = await engine.synthesize({ text: 'This sentence is spoken with the cloned voice.', voice, engineVoiceId: made.engineVoiceId, language: 'en' })
    expect(wavDurationMs(out.audio)).toBeGreaterThan(1500)
    expect(speakerEmbedding(out.audio).voicedMs).toBeGreaterThan(1000)
  }, 180_000)
})
