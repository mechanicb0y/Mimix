import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { POST as preview } from '@/app/api/v1/voices/mix/preview/route'
import { POST as save } from '@/app/api/v1/voices/mix/route'
import { POST as tts } from '@/app/api/v1/text-to-speech/route'
import { POST as demoMix } from '@/app/api/demo/mix/route'
import { getDb, schema } from '@/server/db'
import { setMixerEngineForTests, setVoiceEngineForTests } from '@/server/engine'
import { resetEnvForTests } from '@/server/env'
import { newId } from '@/server/ids'
import { drainInline } from '@/server/jobs'
import { promoteMix } from '@/server/modules/mixer'
import { KokoroEngine, parseRecipe } from '@/lib/voice/kokoro-engine'
import { MockEngine } from '@/lib/voice/mock-engine'
import type { CloneRequest } from '@/lib/voice/types'
import { call, workspaceWithKey } from '../support/fixtures'

/**
 * Mixer v1 on a stub Kokoro server: recipes go over the wire, the Mixer refuses clones for now,
 * and "mix, then clone" hands a system-made reference to the main engine's instant clone.
 */
const voiceBank = new MockEngine()
const requests: Array<{ text: string; recipe: string }> = []
const kokoro = new KokoroEngine({
  url: 'https://kokoro.test', token: 'stub-token',
  fetch: async (_url, init = {}) => {
    const body = JSON.parse(String(init.body)) as { text: string; recipe: string }
    requests.push(body)
    const out = await voiceBank.synthesize({ text: body.text, voice: { f0: 150, formantShift: 1, rate: 4.5, breathiness: 0.1, brightness: 0.5, expressiveness: 0.5 } })
    return new Response(out.audio as BodyInit, { headers: { 'Content-Type': 'audio/wav' } })
  },
})
class RecordingMain extends MockEngine {
  clones: CloneRequest[] = []
  override async clone(req: CloneRequest) { this.clones.push(req); return { ...(await super.clone(req)), engineVoiceId: `main_${this.clones.length}` } }
}
const main = new RecordingMain()
const two = [{ voiceId: 'mix_hollis', weight: 0.6 }, { voiceId: 'mix_miles', weight: 0.4 }]

describe('Voice Mixer v1 on Kokoro', () => {
  beforeAll(() => { setMixerEngineForTests(kokoro); setVoiceEngineForTests(main) })
  afterAll(() => { setMixerEngineForTests(undefined); setVoiceEngineForTests(undefined); delete process.env.MIX_CLONE_TO_MAIN; resetEnvForTests() })
  beforeEach(() => { requests.length = 0; main.clones.length = 0 })

  it('previews a blend of two Kokoro library voices as one recipe', async () => {
    const w = await workspaceWithKey()
    const r = await call(preview, { key: w.key, json: { sources: two, adjust: { pitch: 0.2 } } })
    expect(r.status).toBe(200)
    expect(requests).toHaveLength(1)
    expect(parseRecipe(requests[0]!.recipe)).toMatchObject({ weights: { af_heart: 0.6, am_michael: 0.4 }, pitch: 0.2 })
  })

  it('says mixing your own voices comes later', async () => {
    const w = await workspaceWithKey()
    const mine = newId('voice')
    await getDb().insert(schema.voice).values({ id: mine, workspaceId: w.workspaceId, name: 'My clone', kind: 'instant_clone', status: 'active', licence: 'private', params: { f0: 150, formantShift: 1, rate: 4.5, breathiness: 0.1, brightness: 0.5, expressiveness: 0.5 } })
    const r = await call(preview, { key: w.key, json: { sources: [{ voiceId: 'mix_hollis', weight: 0.5 }, { voiceId: mine, weight: 0.5 }] } })
    expect(r.status).toBe(422)
    expect(r.data.error.code).toBe('voice_not_mixable_yet')
    expect(r.data.error.fields['sources.1.voiceId']).toMatch(/coming later/)
    // The old preview voices have no recipe, so they are not Mixer sources either.
    const old = await call(preview, { key: w.key, json: { sources: [{ voiceId: 'mix_hollis', weight: 0.5 }, { voiceId: 'lib_wren', weight: 0.5 }] } })
    expect(old.data.error.code).toBe('voice_not_mixable_yet')
  })

  it('saves a mix that speaks on the mixer and can be mixed again', async () => {
    const w = await workspaceWithKey({ credits: 10_000, plan: 'pro' })
    const r = await call(save, { key: w.key, json: { sources: two, name: 'Holmi' } })
    expect(r.status).toBe(201)
    expect(r.data).toMatchObject({ mixable: true, promoteStatus: null })
    const [row] = await getDb().select().from(schema.voice).where(eq(schema.voice.id, r.data.id))
    expect(row).toMatchObject({ engine: 'kokoro', mixRecipe: row!.engineVoiceId })
    requests.length = 0
    const speech = await call(tts, { key: w.key, json: { text: 'Hello from a new voice.', voiceId: r.data.id, format: 'wav' } })
    expect(speech.status).toBe(201)
    expect(requests[0]!.recipe).toBe(row!.mixRecipe)

    const again = await call(save, { key: w.key, json: { sources: [{ voiceId: r.data.id, weight: 0.5 }, { voiceId: 'mix_gideon', weight: 0.5 }], name: 'Holmi George' } })
    expect(again.status).toBe(201)
    const [second] = await getDb().select().from(schema.voice).where(eq(schema.voice.id, again.data.id))
    expect(parseRecipe(second!.mixRecipe)!.weights).toEqual({ af_heart: 0.3, am_michael: 0.2, bm_george: 0.5 })
  })

  it('mix, then clone: gives the main engine a ~30 s system reference and moves the voice to it', async () => {
    process.env.MIX_CLONE_TO_MAIN = 'true'; resetEnvForTests()
    const w = await workspaceWithKey({ credits: 10_000 })
    const r = await call(save, { key: w.key, json: { sources: two, name: 'Upgraded' } })
    expect(r.data.promoteStatus).toBe('pending')
    await drainInline()
    expect(main.clones).toHaveLength(1)
    expect(main.clones[0]).toMatchObject({ kind: 'instant', name: 'Upgraded' })
    expect(requests.at(-1)!.text.split(/\s+/).length).toBeGreaterThan(70) // about 30 s of speech
    const [row] = await getDb().select().from(schema.voice).where(eq(schema.voice.id, r.data.id))
    expect(row).toMatchObject({ engine: 'mock', engineVoiceId: 'main_1', promoteStatus: 'done' })
    expect(parseRecipe(row!.mixRecipe)).not.toBeNull() // still mixable
    const log = await getDb().select().from(schema.auditLog).where(and(eq(schema.auditLog.action, 'voice.mix_promoted'), eq(schema.auditLog.targetId, r.data.id)))
    expect(log).toHaveLength(1)

    // Speech now comes from the main engine, not the mixer.
    requests.length = 0
    const speech = await call(tts, { key: w.key, json: { text: 'Now on the main engine.', voiceId: r.data.id, format: 'wav' } })
    expect(speech.status).toBe(201)
    expect(requests).toHaveLength(0)
    delete process.env.MIX_CLONE_TO_MAIN; resetEnvForTests()
  })

  it('never makes a system reference from a lineage that includes a person’s voice', async () => {
    const w = await workspaceWithKey()
    const clone = newId('voice'); const mix = newId('voice')
    const params = { f0: 150, formantShift: 1, rate: 4.5, breathiness: 0.1, brightness: 0.5, expressiveness: 0.5 }
    await getDb().insert(schema.voice).values([
      { id: clone, workspaceId: w.workspaceId, name: 'A person', kind: 'instant_clone', status: 'active', licence: 'private', params, mixRecipe: 'af_bella:1;speed=1;pitch=0;warmth=0' },
      { id: mix, workspaceId: w.workspaceId, name: 'Sneaky', kind: 'mixed', status: 'active', licence: 'private', params, engine: 'kokoro', mixRecipe: 'af_bella:0.5,af_heart:0.5;speed=1;pitch=0;warmth=0' },
    ])
    await getDb().insert(schema.voiceLineage).values([{ mixVoiceId: mix, sourceVoiceId: clone, weight: 0.5 }, { mixVoiceId: mix, sourceVoiceId: 'mix_hollis', weight: 0.5 }])
    await expect(promoteMix(mix)).rejects.toMatchObject({ code: 'reference_not_synthetic' })
    expect(main.clones).toHaveLength(0)
  })

  it('lets the public playground blend Kokoro voices', async () => {
    const req = new Request('http://localhost/api/demo/mix', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost', host: 'localhost' }, body: JSON.stringify({ sources: [{ voiceId: 'hollis', weight: 0.5 }, { voiceId: 'gideon', weight: 0.5 }] }) })
    const res = await demoMix(req)
    expect(res.status).toBe(200)
    expect(parseRecipe(requests[0]!.recipe)!.weights).toEqual({ af_heart: 0.5, bm_george: 0.5 })
  })
})
