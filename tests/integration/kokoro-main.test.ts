import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { POST as tts } from '@/app/api/v1/text-to-speech/route'
import { POST as preview } from '@/app/api/v1/voices/mix/preview/route'
import { POST as save } from '@/app/api/v1/voices/mix/route'
import { GET as library } from '@/app/api/v1/library/route'
import { POST as stt } from '@/app/api/v1/speech-to-text/route'
import { POST as isolator } from '@/app/api/v1/voice-isolator/route'
import { POST as design } from '@/app/api/v1/voices/design/route'
import { POST as designSave } from '@/app/api/v1/voices/design/save/route'
import { GET as jobRoute } from '@/app/api/v1/jobs/[id]/route'
import { capabilitiesFor, createVoiceEngine, engineFeatures, getMixerEngine, setMixerEngineForTests, setVoiceEngineForTests } from '@/server/engine'
import { env, resetEnvForTests } from '@/server/env'
import { drainInline } from '@/server/jobs'
import { KokoroEngine, parseRecipe } from '@/lib/voice/kokoro-engine'
import { MockEngine } from '@/lib/voice/mock-engine'
import { LIBRARY_VOICES } from '@/config/voices'
import { KOKORO_LIBRARY } from '@/config/kokoro-voices'
import { call, workspaceWithKey } from '../support/fixtures'
import { uploadFile } from '../support/uploads'

/**
 * Kokoro as the main engine (VOICE_ENGINE=kokoro): Text to Speech, the Mixer, Speech to Text and the
 * Voice Isolator all go to one stub Kokoro server, and library voices speak through their Kokoro voice.
 */
const bank = new MockEngine()
const params = LIBRARY_VOICES[0]!.params
const calls: Array<{ path: string; body?: { text: string; recipe: string; language?: string } }> = []
const stub = async (url: string, init: RequestInit = {}) => {
  const path = new URL(url).pathname
  if (path === '/v1/tts') {
    const body = JSON.parse(String(init.body)) as { text: string; recipe: string; language?: string }
    calls.push({ path, body })
    return new Response((await bank.synthesize({ text: body.text, voice: params })).audio as BodyInit, { headers: { 'Content-Type': 'audio/wav' } })
  }
  calls.push({ path })
  expect(init.body).toBeInstanceOf(FormData)
  expect((init.headers as Record<string, string>).Authorization).toBe('Bearer stub-token-0123456789')
  if (path === '/v1/transcribe') {
    return Response.json({ language: 'en', durationMs: 2000, segments: [{ startMs: 0, endMs: 1800, speaker: 'Speaker 1', text: 'Hello from the stub.' }] })
  }
  const file = (init.body as FormData).get('file') as Blob
  return new Response(file, { headers: { 'Content-Type': 'audio/wav' } })
}
const kokoro = new KokoroEngine({ url: 'http://127.0.0.1:8810', token: 'stub-token-0123456789', fetch: stub, features: ['transcribe', 'isolate'], main: true })

describe('Kokoro as the main engine', () => {
  beforeAll(() => { setVoiceEngineForTests(kokoro); setMixerEngineForTests(undefined) })
  afterAll(() => { setVoiceEngineForTests(undefined); setMixerEngineForTests(undefined); resetEnvForTests() })
  beforeEach(() => { calls.length = 0 })

  it('is built from the environment, reusing the mixer server settings', () => {
    const e = { ...env(), VOICE_ENGINE: 'kokoro' as const, MIXER_ENGINE_URL: 'http://127.0.0.1:8810', MIXER_ENGINE_TOKEN: 'x'.repeat(24), KOKORO_FEATURES: 'transcribe' }
    const made = createVoiceEngine(e)
    expect(made.id).toBe('kokoro')
    expect(made.capabilities).toMatchObject({ mix: true, transcribe: true, isolate: false, instantClone: false, convert: false, soundEffects: false, design: true })
    expect(capabilitiesFor(e)).toMatchObject({ isMock: false, capabilities: { transcribe: true, isolate: false } })
    expect(() => createVoiceEngine({ ...e, MIXER_ENGINE_URL: undefined })).toThrow(/MIXER_ENGINE_URL/)
    expect(() => createVoiceEngine({ ...e, KOKORO_FEATURES: 'dub' })).toThrow(/unknown entries: dub/)
    // Cloning needs Speech to Text too: the consent check hears the phrase with it.
    expect(createVoiceEngine({ ...e, KOKORO_FEATURES: 'clone' }).capabilities).toMatchObject({ instantClone: false })
    expect(createVoiceEngine({ ...e, KOKORO_FEATURES: 'transcribe,clone' }).capabilities).toMatchObject({ instantClone: true })
  })

  it('turns on the tools Kokoro runs and keeps the rest off', () => {
    expect(getMixerEngine()).toBe(kokoro)
    expect(engineFeatures()).toMatchObject({ mixer: true, stt: true, isolator: true, clone: false, design: true, changer: false, sfx: false })
  })

  it('speaks a library voice with its mapped Kokoro voice', async () => {
    const w = await workspaceWithKey({ credits: 5000 })
    const r = await call(tts, { key: w.key, json: { text: 'Good morning from Wren.', voiceId: 'lib_wren', format: 'wav' } })
    expect(r.status).toBe(201)
    expect(parseRecipe(calls[0]!.body!.recipe)!.weights).toEqual({ [KOKORO_LIBRARY.wren!]: 1 })
    // The text's language goes along, so Spanish words are pronounced as Spanish.
    await call(tts, { key: w.key, json: { text: 'Hola a todos.', voiceId: 'lib_elio', format: 'wav', language: 'es' } })
    expect(calls[1]!.body).toMatchObject({ recipe: expect.stringContaining('em_alex:1'), language: 'es' })
  })

  it('hides library voices Kokoro cannot speak, and says so if one is used', async () => {
    const w = await workspaceWithKey({ credits: 5000 })
    const lib = await call(library, { key: w.key, path: '/api/v1/library?language=ar' })
    expect(lib.data.items.map((v: { id: string }) => v.id)).not.toContain('lib_noor')
    for (const [q, id] of [['Wren', 'lib_wren'], ['Hollis', 'mix_hollis']]) {
      const found = await call(library, { key: w.key, path: `/api/v1/library?q=${q}` })
      expect(found.data.items.map((v: { id: string }) => v.id)).toContain(id)
    }
    const r = await call(tts, { key: w.key, json: { text: 'Marhaba.', voiceId: 'lib_noor', format: 'wav' } })
    expect(r.status).toBe(422)
    expect(r.data.error.message).toMatch(/isn’t available on this voice engine/)
  })

  it('has all 54 Kokoro voices in the library, in 8 languages', async () => {
    const w = await workspaceWithKey({ credits: 5000 })
    const { MIXER_VOICES } = await import('@/config/mixer-voices')
    const ids = new Set([...MIXER_VOICES.map((v) => v.kokoro), ...Object.values(KOKORO_LIBRARY)])
    expect(ids.size).toBe(54)
    const zh = await call(library, { key: w.key, path: '/api/v1/library?language=zh' })
    expect(zh.data.items).toHaveLength(8)
    const ja = await call(library, { key: w.key, path: '/api/v1/library?language=ja' })
    expect(ja.data.items).toHaveLength(5)
    // A Mandarin voice speaks through its own Kokoro voice.
    calls.length = 0
    const r = await call(tts, { key: w.key, json: { text: '你好，欢迎。', voiceId: 'mix_yuxin', format: 'wav' } })
    expect(r.status).toBe(201)
    expect(parseRecipe(calls[0]!.body!.recipe)!.weights).toEqual({ zf_xiaoxiao: 1 })
  })

  it('mixes library voices and Kokoro voices into a recipe that speaks on Kokoro', async () => {
    const w = await workspaceWithKey({ credits: 10_000, plan: 'pro' })
    const sources = [{ voiceId: 'lib_wren', weight: 0.5 }, { voiceId: 'mix_miles', weight: 0.5 }]
    const p = await call(preview, { key: w.key, json: { sources } })
    expect(p.status).toBe(200)
    expect(parseRecipe(calls.at(-1)!.body!.recipe)!.weights).toEqual({ [KOKORO_LIBRARY.wren!]: 0.5, am_michael: 0.5 })
    const saved = await call(save, { key: w.key, json: { sources, name: 'Wrenmiles' } })
    expect(saved.status).toBe(201)
    expect(saved.data).toMatchObject({ mixable: true, promoteStatus: null })
    calls.length = 0
    const speech = await call(tts, { key: w.key, json: { text: 'A new voice.', voiceId: saved.data.id, format: 'wav' } })
    expect(speech.status).toBe(201)
    expect(parseRecipe(calls[0]!.body!.recipe)!.weights).toEqual({ [KOKORO_LIBRARY.wren!]: 0.5, am_michael: 0.5 })
  })

  it('designs three voices as Mixer recipes and saves one as a mixable voice', async () => {
    const w = await workspaceWithKey({ credits: 10_000, plan: 'pro' })
    calls.length = 0
    const d = await call(design, { key: w.key, json: { description: 'A calm older British man for audiobooks.', language: 'en', traits: { gender: 'male', pitch: 'low', pace: 'slow' } } })
    expect(d.status, JSON.stringify(d.data)).toBe(201)
    expect(d.data.candidates).toHaveLength(3)
    expect(calls.filter((c) => c.path === '/v1/tts')).toHaveLength(3)
    for (const c of calls) expect(Object.keys(parseRecipe(c.body!.recipe)!.weights).every((k) => k.startsWith('bm_'))).toBe(true)
    const saved = await call(designSave, { key: w.key, json: { designId: d.data.id, candidate: 1, name: 'Ellis' } })
    expect(saved.status).toBe(201)
    expect(saved.data).toMatchObject({ kind: 'designed', mixable: true, gender: 'male' })
    const de = await call(design, { key: w.key, json: { description: 'Ein ruhiger Sprecher für Hörbücher.', language: 'de' } })
    expect(de.status).toBe(422)
  })

  it('runs Speech to Text and the Voice Isolator on the Kokoro server', async () => {
    const w = await workspaceWithKey({ credits: 5000 })
    const audio = (await bank.synthesize({ text: 'Hello from the stub, said twice. Hello from the stub.', voice: params })).audio
    const up = await uploadFile(w.key, audio, { purpose: 'media', filename: 'call.wav' })
    const r = await call(stt, { key: w.key, json: { uploadId: up.id } })
    expect(r.status).toBe(202)
    await drainInline()
    expect((await call(jobRoute, { key: w.key, params: { id: r.data.id } })).data.status).toBe('succeeded')
    const up2 = await uploadFile(w.key, audio, { purpose: 'media', filename: 'noisy.wav' })
    const iso = await call(isolator, { key: w.key, json: { uploadId: up2.id, format: 'wav' } })
    await drainInline()
    expect((await call(jobRoute, { key: w.key, params: { id: iso.data.id } })).data.status).toBe('succeeded')
    expect(calls.map((c) => c.path)).toEqual(['/v1/transcribe', '/v1/isolate'])
  })
})
