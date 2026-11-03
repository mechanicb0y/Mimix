import { describe, expect, it } from 'vitest'
import { blendRecipes, cloneBase, formatRecipe, KokoroEngine, kokoroMainCapabilities, parseRecipe, voiceRecipe } from '@/lib/voice/kokoro-engine'
import { encodeWav } from '@/lib/voice/wav'
import { EngineError, type VoiceParams } from '@/lib/voice/types'

const VOICE: VoiceParams = { f0: 120, formantShift: 1, rate: 4.4, breathiness: 0.1, brightness: 0.5, expressiveness: 0.5 }
const wav = () => encodeWav(new Float32Array(2400), 24000)

describe('Kokoro recipes', () => {
  it('parses, normalises and formats a recipe', () => {
    const r = parseRecipe('af_heart:3,am_michael:1;speed=1.1;pitch=0.2;warmth=-0.4')!
    expect(r.weights).toEqual({ af_heart: 0.75, am_michael: 0.25 })
    expect(r).toMatchObject({ speed: 1.1, pitch: 0.2, warmth: -0.4 })
    expect(formatRecipe(r)).toBe('af_heart:0.75,am_michael:0.25;speed=1.1;pitch=0.2;warmth=-0.4')
    expect(voiceRecipe('bm_george')).toBe('bm_george:1;speed=1;pitch=0;warmth=0')
  })

  it('rejects anything that is not a recipe, such as another engine’s voice id', () => {
    for (const bad of [null, '', 'Dennis', 'vox_abc123', 'af_heart:0', 'af_heart:-1', 'af_heart:1;loud=2', 'af_heart:1;speed=x', 'AF_HEART:1']) {
      expect(parseRecipe(bad)).toBeNull()
    }
  })

  it('clamps out-of-range settings', () => {
    expect(parseRecipe('af_heart:1;speed=9;pitch=-5;warmth=5')).toMatchObject({ speed: 2, pitch: -1, warmth: 1 })
  })

  it('blends by weight and flattens mixes of mixes into Kokoro voices', () => {
    const a = parseRecipe(voiceRecipe('af_heart'))!
    const ab = blendRecipes([{ recipe: a, weight: 0.5 }, { recipe: parseRecipe(voiceRecipe('am_michael'))!, weight: 0.5 }])
    const mixOfMix = blendRecipes([{ recipe: ab, weight: 0.5 }, { recipe: parseRecipe(voiceRecipe('bm_george'))!, weight: 0.5 }])
    expect(mixOfMix.weights).toEqual({ af_heart: 0.25, am_michael: 0.25, bm_george: 0.5 })
  })

  it('adds the mix’s own pace, pitch and warmth on top of the sources', () => {
    const s = [{ recipe: parseRecipe('af_heart:1;speed=1;pitch=0.5;warmth=0')!, weight: 1 }, { recipe: parseRecipe('am_adam:1;speed=1;pitch=0.5;warmth=0')!, weight: 1 }]
    const r = blendRecipes(s, { pace: 1, pitch: 0.8, warmth: -0.3 })
    expect(r.speed).toBeCloseTo(1.25)
    expect(r.pitch).toBe(1) // 0.5 + 0.8, clamped
    expect(r.warmth).toBeCloseTo(-0.3)
  })

  it('needs two sources with positive weight', () => {
    expect(() => blendRecipes([{ recipe: parseRecipe(voiceRecipe('af_heart'))!, weight: 1 }])).toThrow(EngineError)
  })
})

describe('KokoroEngine', () => {
  it('posts the recipe with the request speed and a bearer token', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const engine = new KokoroEngine({ url: 'https://mixer.test/', token: 'tok', fetch: async (url, init = {}) => { calls.push({ url, init }); return new Response(wav() as BodyInit, { headers: { 'Content-Type': 'audio/wav' } }) } })
    const out = await engine.synthesize({ text: 'Hello.', voice: VOICE, engineVoiceId: 'af_heart:0.5,am_michael:0.5;speed=1.2;pitch=0;warmth=0', settings: { speed: 0.8 } })
    expect(out.mimeType).toBe('audio/wav')
    expect(calls[0]!.url).toBe('https://mixer.test/v1/tts')
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    const body = JSON.parse(String(calls[0]!.init.body))
    expect(body.recipe).toBe('af_heart:0.5,am_michael:0.5;speed=0.96;pitch=0;warmth=0')
  })

  it('refuses a voice with no recipe and mixes only recipes', async () => {
    const engine = new KokoroEngine({ url: 'https://mixer.test', fetch: async () => new Response(wav() as BodyInit) })
    await expect(engine.synthesize({ text: 'Hi', voice: VOICE, engineVoiceId: 'Dennis' })).rejects.toBeInstanceOf(EngineError)
    await expect(engine.mix({ sources: [{ voice: VOICE, weight: 0.5, engineVoiceId: voiceRecipe('af_heart') }, { voice: VOICE, weight: 0.5, engineVoiceId: null }] })).rejects.toMatchObject({ status: 501 })
    const mixed = await engine.mix({ sources: [{ voice: VOICE, weight: 0.6, engineVoiceId: voiceRecipe('af_heart') }, { voice: VOICE, weight: 0.4, engineVoiceId: voiceRecipe('am_michael') }] })
    expect(mixed.engineVoiceId).toBe('af_heart:0.6,am_michael:0.4;speed=1;pitch=0;warmth=0')
  })

  it('does not clone as the mixer, or without the clone and transcribe extras', async () => {
    const engine = new KokoroEngine({ url: 'https://mixer.test' })
    await expect(engine.clone({ samples: [wav()], name: 'A', kind: 'instant' })).rejects.toMatchObject({ status: 501 })
    expect(engine.capabilities.instantClone).toBe(false)
    expect(engine.capabilities.mix).toBe(true)
    expect(kokoroMainCapabilities(['clone']).instantClone).toBe(false)
    expect(kokoroMainCapabilities(['clone', 'transcribe']).instantClone).toBe(true)
    expect(kokoroMainCapabilities(['clone', 'transcribe']).professionalClone).toBe(false)
  })

  it('clones: a Kokoro base voice near the speaker\'s pitch plus the speaker\'s tone', async () => {
    const tone = 'A'.repeat(683)
    const calls: Array<{ url: string; init: RequestInit }> = []
    const engine = new KokoroEngine({
      url: 'https://k.test', token: 'tok', main: true, features: ['clone', 'transcribe'],
      fetch: async (url, init) => { calls.push({ url: String(url), init: init! }); return Response.json({ tone, f0: 110, seconds: 12 }) },
    })
    const made = await engine.clone({ samples: [wav(), wav()], name: 'Me', kind: 'instant', language: 'en' })
    expect(calls[0]!.url).toBe('https://k.test/v1/clone')
    expect((calls[0]!.init.body as FormData).getAll('files')).toHaveLength(2)
    const r = parseRecipe(made.engineVoiceId)!
    expect(r.tone).toBe(tone)
    expect(Object.keys(r.weights)).toHaveLength(1)
    expect(Object.keys(r.weights)[0]).toMatch(/^[ab]m_/)
    expect(made.params.f0).toBe(110)
    // The tone survives a round trip and is sent with every line.
    expect(formatRecipe(r)).toBe(made.engineVoiceId)
    await expect(engine.clone({ samples: [wav()], name: 'Me', kind: 'professional' })).rejects.toMatchObject({ status: 501 })
    // A cloned voice can't be a Mixer source yet.
    await expect(engine.mix({ sources: [{ voice: VOICE, weight: 0.5, engineVoiceId: made.engineVoiceId }, { voice: VOICE, weight: 0.5, engineVoiceId: voiceRecipe('af_heart') }] })).rejects.toMatchObject({ status: 501 })
  })

  it('picks a base voice in the clone\'s language, by pitch', () => {
    expect(cloneBase(220, 'en')[1]).toBe('f')
    expect(cloneBase(100, 'en')[1]).toBe('m')
    expect(cloneBase(220, 'ja')[0]).toBe('j')
    expect(cloneBase(220, 'zh-CN')[0]).toBe('z')
    expect(cloneBase(220, 'de')[0]).toMatch(/[ab]/)
    expect(parseRecipe('af_heart:1;tone=short')).toBeNull()
  })
})
