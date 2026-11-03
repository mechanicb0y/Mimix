import { afterEach, describe, expect, it } from 'vitest'
import { POST as clone } from '@/app/api/v1/voices/clone/route'
import { POST as phrase } from '@/app/api/v1/voices/[id]/consent/phrase/route'
import { GET as records, POST as consent } from '@/app/api/v1/voices/[id]/consent/route'
import { MockEngine } from '@/lib/voice/mock-engine'
import { LIBRARY_VOICES } from '@/config/voices'
import { drainInline } from '@/server/jobs'
import { resetEnvForTests } from '@/server/env'
import { compareSpeakers, meanSpeaker, setSpeakerEmbedderForTests, speakerVerifier } from '@/server/speaker-verifier'
import { speakerEmbedding } from '@/server/speaker'
import { getDb, schema } from '@/server/db'
import { eq } from 'drizzle-orm'
import { call, workspaceWithKey } from '../support/fixtures'
import { uploadFile } from '../support/uploads'

/**
 * The consent check with SPEAKER_VERIFIER=neural. The Kokoro server's CAM++ model is replaced by a
 * stand-in with the same shape (64 numbers, length 1, cosine scores): a bump placed by the speaker's
 * pitch, so the preview engine's voices score near 1 against themselves and near 0 against others.
 * The real model is tested against the Kokoro server in kokoro-live.test.ts.
 */
const engine = new MockEngine()
const params = (id: string) => LIBRARY_VOICES.find((v) => v.id === id)!.params
const LONG = 'This is a sample of my natural speaking voice. I am reading a few sentences about the weather, the city and my favourite books, so the clone can learn how I sound when I talk at an easy pace.'
const speech = async (voice: string, text = LONG, seed = 's') => (await engine.synthesize({ text, voice: params(voice), seed })).audio

const ENV = { SPEAKER_VERIFIER: 'neural', KOKORO_FEATURES: 'clone', MIXER_ENGINE_URL: 'http://kokoro.test' }
function withNeural(extra: Record<string, string> = {}) {
  Object.assign(process.env, ENV, extra)
  resetEnvForTests()
  setSpeakerEmbedderForTests(async (wav) => {
    const d = speakerEmbedding(wav)
    const centre = (d.v[0] ?? 0) * 4 + 24
    const v = Array.from({ length: 64 }, (_, i) => Math.exp(-((i - centre) ** 2) / 8))
    return { v: meanSpeaker([v]), voicedMs: d.voicedMs }
  })
}
afterEach(() => {
  for (const k of [...Object.keys(ENV), 'SPEAKER_MATCH', 'SPEAKER_MATCH_TUNED']) delete process.env[k]
  resetEnvForTests()
  setSpeakerEmbedderForTests(undefined)
})

async function startClone(w: { key: string }, voice = 'wren') {
  const ids: string[] = []
  for (let i = 0; i < 3; i++) ids.push((await uploadFile(w.key, await speech(voice, LONG, `s${i}`), { purpose: 'voice_sample', filename: `take${i}.wav` })).id!)
  const r = await call(clone, { key: w.key, json: { kind: 'instant', name: 'My voice', uploadIds: ids, rightsConfirmed: true } })
  await drainInline()
  return r.data.voice.id as string
}

async function record(w: { key: string }, id: string, voice: string) {
  const p = await call(phrase, { key: w.key, method: 'POST', params: { id } })
  const rec = await uploadFile(w.key, await speech(voice, p.data.phrase, 'consent'), { purpose: 'consent', filename: 'consent.wav' })
  return call(consent, { key: w.key, params: { id }, json: { consentId: p.data.consentId, uploadId: rec.id } })
}

describe('Neural consent check', () => {
  it('reports itself ready only when the Kokoro server runs the clone extra, with the tuned pass mark', () => {
    withNeural({ KOKORO_FEATURES: 'transcribe' })
    expect(speakerVerifier()).toMatchObject({ kind: 'neural', productionReady: false, match: 0.5, tuned: null })
    withNeural({ SPEAKER_MATCH: '0.62', SPEAKER_MATCH_TUNED: '2026-11-04 · 18 recordings, 3 people' })
    expect(speakerVerifier()).toMatchObject({ kind: 'neural', productionReady: true, model: 'campplus-voxceleb', match: 0.62, takedown: 0.62, tuned: '2026-11-04 · 18 recordings, 3 people' })
    expect(compareSpeakers([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(0)
    expect(compareSpeakers([1, 2, 3], [1, 2])).toBe(0)
  })

  it('stores a neural embedding, passes the same speaker and refuses another', async () => {
    withNeural()
    const w = await workspaceWithKey()
    const id = await startClone(w, 'wren')
    const [v] = await getDb().select().from(schema.voice).where(eq(schema.voice.id, id))
    expect(v!.speakerEmbedding).toHaveLength(64)
    const bad = await record(w, id, 'atlas')
    expect(bad.status).toBe(422)
    expect(bad.data.error.code).toBe('consent_voice_mismatch')
    const ok = await record(w, id, 'wren')
    expect(ok.status).toBe(200)
    const list = await call(records, { key: w.key, params: { id } })
    const scores = list.data.items.map((r: { speakerScore: number }) => r.speakerScore)
    expect(scores[0]).toBeLessThan(0.5)
    expect(scores[1]).toBeGreaterThanOrEqual(0.5)
  })

  it('measures samples again when the voice was prepared with the stand-in verifier', async () => {
    const w = await workspaceWithKey()
    const id = await startClone(w, 'wren')
    const [before] = await getDb().select().from(schema.voice).where(eq(schema.voice.id, id))
    expect(before!.speakerEmbedding!.length).toBeLessThan(16)
    withNeural()
    const ok = await record(w, id, 'wren')
    expect(ok.status).toBe(200)
    const [after] = await getDb().select().from(schema.voice).where(eq(schema.voice.id, id))
    expect(after!.speakerEmbedding).toHaveLength(64)
  })

  it('uses the tuned pass mark', async () => {
    for (const [mark, status] of [['0.6', 200], ['0.8', 422]] as const) {
      withNeural({ SPEAKER_MATCH: mark })
      // The three samples and the consent recording score exactly 0.7.
      let calls = 0
      setSpeakerEmbedderForTests(async () => {
        const sample = ++calls <= 3
        return { v: sample ? [1, 0, ...new Array(30).fill(0)] : [0.7, Math.sqrt(1 - 0.49), ...new Array(30).fill(0)], voicedMs: sample ? 5000 : 3000 }
      })
      const w = await workspaceWithKey()
      const id = await startClone(w, 'wren')
      const res = await record(w, id, 'wren')
      expect(res.data.error?.code ?? 'ok').toBe(status === 200 ? 'ok' : 'consent_voice_mismatch')
      expect(res.status).toBe(status)
      const list = await call(records, { key: w.key, params: { id } })
      expect(list.data.items[0].speakerScore).toBe(0.7)
    }
  })
})
