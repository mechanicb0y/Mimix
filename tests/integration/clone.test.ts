import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { POST as clone } from '@/app/api/v1/voices/clone/route'
import { POST as phrase } from '@/app/api/v1/voices/[id]/consent/phrase/route'
import { GET as records, POST as consent } from '@/app/api/v1/voices/[id]/consent/route'
import { POST as tts } from '@/app/api/v1/text-to-speech/route'
import { GET as jobRoute } from '@/app/api/v1/jobs/[id]/route'
import { MockEngine } from '@/lib/voice/mock-engine'
import { LIBRARY_VOICES } from '@/config/voices'
import { drainInline } from '@/server/jobs'
import { getDb, schema } from '@/server/db'
import { phraseScore } from '@/server/modules/clone'
import { call, workspaceWithKey } from '../support/fixtures'
import { uploadFile } from '../support/uploads'

const engine = new MockEngine()
const params = (id: string) => LIBRARY_VOICES.find((v) => v.id === id)!.params
const LONG = 'This is a sample of my natural speaking voice. I am reading a few sentences about the weather, the city and my favourite books, so the clone can learn how I sound when I talk at an easy pace.'
const speech = async (voice: string, text = LONG, seed = 's') => (await engine.synthesize({ text, voice: params(voice), seed })).audio

async function startClone(w: { key: string }, voice = 'wren', extra: Record<string, unknown> = {}) {
  const ids: string[] = []
  for (let i = 0; i < 3; i++) ids.push((await uploadFile(w.key, await speech(voice, LONG, `s${i}`), { purpose: 'voice_sample', filename: `take${i}.wav` })).id!)
  const r = await call(clone, { key: w.key, json: { kind: 'instant', name: 'My voice', uploadIds: ids, rightsConfirmed: true, ...extra } })
  await drainInline()
  return r
}

describe('Uploads', () => {
  it('rejects wrong extensions, oversize files and bytes that are not audio', async () => {
    const w = await workspaceWithKey()
    const bad = await uploadFile(w.key, new Uint8Array(10), { purpose: 'voice_sample', filename: 'notes.txt', contentType: 'text/plain' })
    expect(bad.status).toBe(422)
    expect(bad.data.error.fields.file).toMatch(/MP3, WAV/)
    const fake = await uploadFile(w.key, new TextEncoder().encode('just text pretending to be audio'), { purpose: 'consent', filename: 'fake.wav' })
    expect(fake.status).toBe(422)
    expect(fake.data.error.code).toBe('file_type')
  })
})

describe('Voice Cloning with consent', () => {
  it('runs the full flow: samples → phrase → verified recording → usable voice with a consent record', async () => {
    const w = await workspaceWithKey()
    const r = await startClone(w)
    expect(r.status).toBe(202)
    const job = await call(jobRoute, { key: w.key, params: { id: r.data.jobId } })
    expect(job.data).toMatchObject({ status: 'succeeded' })
    const id = r.data.voice.id

    // Not usable before consent.
    expect((await call(tts, { key: w.key, json: { text: 'Hello', voiceId: id } })).status).toBe(409)

    const p = await call(phrase, { key: w.key, method: 'POST', params: { id } })
    expect(p.status).toBe(201)
    expect(p.data.phrase).toMatch(/My code words are \w+, \w+ and \w+\./)
    const rec = await uploadFile(w.key, await speech('wren', p.data.phrase, 'consent'), { purpose: 'consent', filename: 'consent.wav' })
    const ok = await call(consent, { key: w.key, params: { id }, json: { consentId: p.data.consentId, uploadId: rec.id } })
    expect(ok.status).toBe(200)
    expect(ok.data).toMatchObject({ verified: true, voice: { status: 'active', kind: 'instant_clone', licence: 'private' } })
    expect((await call(tts, { key: w.key, json: { text: 'Now it works.', voiceId: id } })).status).toBe(201)

    const list = await call(records, { key: w.key, params: { id } })
    expect(list.data.items).toHaveLength(1)
    expect(list.data.items[0]).toMatchObject({ verified: true, phrase: p.data.phrase, audioSha256: expect.stringMatching(/^[0-9a-f]{64}$/) })
    expect(list.data.items[0].speakerScore).toBeGreaterThanOrEqual(0.75)

    // A phrase can't be used twice.
    const again = await call(consent, { key: w.key, params: { id }, json: { consentId: p.data.consentId, uploadId: rec.id } })
    expect(again.status).toBe(409)
  })

  it('refuses a consent recording by a different speaker and issues a fresh phrase', async () => {
    const w = await workspaceWithKey()
    const id = (await startClone(w, 'wren')).data.voice.id
    const p = await call(phrase, { key: w.key, method: 'POST', params: { id } })
    const rec = await uploadFile(w.key, await speech('atlas', p.data.phrase, 'c'), { purpose: 'consent', filename: 'consent.wav' })
    const r = await call(consent, { key: w.key, params: { id }, json: { consentId: p.data.consentId, uploadId: rec.id } })
    expect(r.status).toBe(422)
    expect(r.data.error.code).toBe('consent_voice_mismatch')
    expect(r.data.error.next.phrase).not.toBe(p.data.phrase)
    expect(r.data.error.attemptsLeft).toBe(4)
    const [v] = await getDb().select().from(schema.voice).where(eq(schema.voice.id, id))
    expect(v!.status).toBe('pending_consent')
    const rows = await getDb().select().from(schema.consentRecord).where(eq(schema.consentRecord.voiceId, id))
    expect(rows.filter((x) => x.audioSha256 && !x.verified)).toHaveLength(1)
  })

  it('locks after five failed attempts', async () => {
    const w = await workspaceWithKey()
    const id = (await startClone(w, 'wren')).data.voice.id
    let p = (await call(phrase, { key: w.key, method: 'POST', params: { id } })).data
    for (let i = 0; i < 5; i++) {
      const rec = await uploadFile(w.key, await speech('atlas', p.phrase, `c${i}`), { purpose: 'consent', filename: 'c.wav' })
      const r = await call(consent, { key: w.key, params: { id }, json: { consentId: p.consentId, uploadId: rec.id } })
      expect(r.status).toBe(422)
      p = r.data.error.next
    }
    expect(p).toBeNull()
    const locked = await call(phrase, { key: w.key, method: 'POST', params: { id } })
    expect(locked.status).toBe(429)
    expect(locked.data.error.code).toBe('consent_locked')
  })

  it('fails the job when there is too little speech, and frees the slot', async () => {
    const w = await workspaceWithKey()
    const up = await uploadFile(w.key, await speech('wren', 'Too short.'), { purpose: 'voice_sample' })
    const r = await call(clone, { key: w.key, json: { kind: 'instant', name: 'Short', uploadIds: [up.id], rightsConfirmed: true } })
    await drainInline()
    const job = await call(jobRoute, { key: w.key, params: { id: r.data.jobId } })
    expect(job.data.status).toBe('failed')
    expect(job.data.error).toMatch(/needs at least 10 seconds/)
    const [v] = await getDb().select().from(schema.voice).where(eq(schema.voice.id, r.data.voice.id))
    expect(v!.status).toBe('deleted')
  })

  it('requires the rights box, blocks public-figure names, and gates professional clones by plan', async () => {
    const w = await workspaceWithKey({ plan: 'free' })
    const up = await uploadFile(w.key, await speech('wren'), { purpose: 'voice_sample' })
    const noBox = await call(clone, { key: w.key, json: { kind: 'instant', name: 'X', uploadIds: [up.id] } })
    expect(noBox.data.error.fields.rightsConfirmed).toBe('Tick the box to confirm you have the right to use this voice.')
    await getDb().insert(schema.blockedVoice).values({ id: 'blk_clone_test', name: 'Famous Singer', aliases: [] }).onConflictDoNothing()
    const famous = await call(clone, { key: w.key, json: { kind: 'instant', name: 'Famous Singer', uploadIds: [up.id], rightsConfirmed: true } })
    expect(famous.data.error.code).toBe('blocked_name')
    const pro = await call(clone, { key: w.key, json: { kind: 'professional', name: 'Pro', uploadIds: [up.id], rightsConfirmed: true } })
    expect(pro.status).toBe(403)
    expect(pro.data.error.code).toBe('plan_feature')
    const instant = await call(clone, { key: w.key, json: { kind: 'instant', name: 'Mine', uploadIds: [up.id], rightsConfirmed: true } })
    expect(instant.status).toBe(403)
    expect(instant.data.error.message).toBe('Instant cloning is included from the Maker plan up.')
  })

  it('blocks cloning a speaker whose voice was taken down', async () => {
    const w = await workspaceWithKey()
    const first = await startClone(w, 'koa')
    await getDb().update(schema.voice).set({ status: 'taken_down', takedownReason: 'report' }).where(eq(schema.voice.id, first.data.voice.id))
    const other = await workspaceWithKey()
    const second = await startClone(other, 'koa')
    const job = await call(jobRoute, { key: other.key, params: { id: second.data.jobId } })
    expect(job.data.status).toBe('failed')
    expect(job.data.error).toMatch(/removed after a report/)
  })

  it('scores phrase matches by words in order', () => {
    expect(phraseScore('I am creating a Mimix voice, amber river silver', 'I am creating a Mimix voice amber river silver.')).toBe(1)
    expect(phraseScore('hello there', 'I am creating a Mimix voice')).toBe(0)
  })
})
