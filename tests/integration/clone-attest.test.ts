import { afterEach, describe, expect, it } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { POST as clone } from '@/app/api/v1/voices/clone/route'
import { GET as records, POST as consent } from '@/app/api/v1/voices/[id]/consent/route'
import { POST as tts } from '@/app/api/v1/text-to-speech/route'
import { GET as jobRoute } from '@/app/api/v1/jobs/[id]/route'
import { MockEngine } from '@/lib/voice/mock-engine'
import { kokoroMainCapabilities } from '@/lib/voice/kokoro-engine'
import { LIBRARY_VOICES } from '@/config/voices'
import { drainInline } from '@/server/jobs'
import { env, resetEnvForTests } from '@/server/env'
import { capabilitiesFor, engineFeatures } from '@/server/engine'
import { getDb, schema } from '@/server/db'
import { call, workspaceWithKey } from '../support/fixtures'
import { uploadFile } from '../support/uploads'

/**
 * CLONE_CONSENT=attest: no read-aloud step. The voice switches on when its samples are ready, on the
 * uploader's confirmation (rightsConfirmed), which is kept as a consent record and in the audit log.
 */
const engine = new MockEngine()
const params = (id: string) => LIBRARY_VOICES.find((v) => v.id === id)!.params
const LONG = 'This is a sample of my natural speaking voice. I am reading a few sentences about the weather, the city and my favourite books, so the clone can learn how I sound when I talk at an easy pace.'
const speech = async (seed: string) => (await engine.synthesize({ text: LONG, voice: params('wren'), seed })).audio

function attest(on: boolean) {
  if (on) process.env.CLONE_CONSENT = 'attest'
  else delete process.env.CLONE_CONSENT
  resetEnvForTests()
}
afterEach(() => attest(false))

async function startClone(w: { key: string }) {
  const ids: string[] = []
  for (let i = 0; i < 3; i++) ids.push((await uploadFile(w.key, await speech(`s${i}`), { purpose: 'voice_sample', filename: `take${i}.wav` })).id!)
  const r = await call(clone, { key: w.key, json: { kind: 'instant', name: 'My voice', uploadIds: ids, rightsConfirmed: true } })
  await drainInline()
  return r
}
const auditOf = (action: string, id: string) => getDb().select().from(schema.auditLog).where(and(eq(schema.auditLog.action, action), eq(schema.auditLog.targetId, id)))

describe('Cloning with consent by confirmation (CLONE_CONSENT=attest)', () => {
  it('switches the voice on as soon as the samples are ready, with a consent record of the confirmation', async () => {
    attest(true)
    const w = await workspaceWithKey()
    const r = await startClone(w)
    expect(r.status).toBe(202)
    const job = await call(jobRoute, { key: w.key, params: { id: r.data.jobId } })
    expect(job.data).toMatchObject({ status: 'succeeded', output: { active: true, trainingJobId: null } })
    const id = r.data.voice.id as string
    expect((await call(tts, { key: w.key, json: { text: 'No phrase needed.', voiceId: id } })).status).toBe(201)

    const list = await call(records, { key: w.key, params: { id } })
    expect(list.data.items).toHaveLength(1)
    expect(list.data.items[0]).toMatchObject({ method: 'attest', verified: true, audioSha256: null, speakerScore: null })
    expect(list.data.items[0].phrase).toMatch(/I am the speaker in these recordings, or I have their written permission/)
    expect(await auditOf('voice.consent_attested', id)).toHaveLength(1)
  })

  it('switches on a voice that was waiting for a recording, and only on a ticked confirmation', async () => {
    const w = await workspaceWithKey()
    const r = await startClone(w) // made with the read-aloud check: waits for consent
    const id = r.data.voice.id as string
    expect((await call(consent, { key: w.key, params: { id }, json: { attest: true } })).status).toBe(409)

    attest(true)
    const unticked = await call(consent, { key: w.key, params: { id }, json: { attest: false } })
    expect(unticked.status).toBe(422)
    const ok = await call(consent, { key: w.key, params: { id }, json: { attest: true } })
    expect(ok.status).toBe(200)
    expect(ok.data).toMatchObject({ verified: true, voice: { status: 'active' }, jobId: null })
    expect((await call(consent, { key: w.key, params: { id }, json: { attest: true } })).status).toBe(409)
  })

  it('lets Kokoro clone without Speech to Text, and tells the app which consent step to show', () => {
    expect(kokoroMainCapabilities(['clone']).instantClone).toBe(false)
    expect(kokoroMainCapabilities(['clone'], { consentNeedsStt: false }).instantClone).toBe(true)
    attest(true)
    const e = { ...env(), VOICE_ENGINE: 'kokoro' as const, MIXER_ENGINE_URL: 'http://127.0.0.1:8810', KOKORO_FEATURES: 'clone' }
    expect(capabilitiesFor(e).capabilities.instantClone).toBe(true)
    expect(engineFeatures().cloneConsent).toBe('attest')
    attest(false)
    expect(capabilitiesFor({ ...e, CLONE_CONSENT: 'recording' }).capabilities.instantClone).toBe(false)
    expect(engineFeatures().cloneConsent).toBe('recording')
  })
})
