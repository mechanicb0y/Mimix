import { describe, expect, it } from 'vitest'
import { POST as design } from '@/app/api/v1/voices/design/route'
import { POST as saveDesign } from '@/app/api/v1/voices/design/save/route'
import { POST as changer } from '@/app/api/v1/voice-changer/route'
import { GET as jobRoute } from '@/app/api/v1/jobs/[id]/route'
import { GET as historyItem } from '@/app/api/v1/history/[id]/route'
import { MockEngine } from '@/lib/voice/mock-engine'
import { LIBRARY_VOICES } from '@/config/voices'
import { CREDIT_RATES } from '@/config/plans'
import { getBalance } from '@/server/credits'
import { getDb, schema } from '@/server/db'
import { drainInline } from '@/server/jobs'
import { call, workspaceWithKey } from '../support/fixtures'
import { uploadFile } from '../support/uploads'

const engine = new MockEngine()
const clip = async (seconds: number) => {
  const words = Array.from({ length: Math.round(seconds * 2.4) }, (_, i) => ['hello', 'there', 'this', 'is', 'a', 'test'][i % 6]).join(' ')
  return (await engine.synthesize({ text: words + '.', voice: LIBRARY_VOICES[0]!.params, seed: 'clip' })).audio
}

describe('Voice Design', () => {
  it('returns three previews for one charge and saves a chosen one as a voice', async () => {
    const w = await workspaceWithKey({ credits: 2000 })
    const r = await call(design, { key: w.key, json: { description: 'A warm, low narrator with a calm and steady delivery.' } })
    expect(r.status).toBe(201)
    expect(r.data.candidates).toHaveLength(3)
    expect(r.data.candidates[0].audioUrl).toMatch(/\/api\/media\//)
    expect((await getBalance(w.workspaceId)).total).toBe(2000 - CREDIT_RATES.voiceDesignPerPreviewSet)

    const s = await call(saveDesign, { key: w.key, json: { designId: r.data.id, candidate: 1, name: 'Calm narrator' } })
    expect(s.status).toBe(201)
    expect(s.data).toMatchObject({ kind: 'designed', status: 'active', licence: 'private', name: 'Calm narrator' })
    const twice = await call(saveDesign, { key: w.key, json: { designId: r.data.id, candidate: 1, name: 'Again' } })
    expect(twice.status).toBe(409)
    expect((await getBalance(w.workspaceId)).total).toBe(2000 - CREDIT_RATES.voiceDesignPerPreviewSet)
  })

  it('validates the description, refuses named public figures, and handles running out of credits', async () => {
    const w = await workspaceWithKey({ credits: 100 })
    const short = await call(design, { key: w.key, json: { description: 'deep' } })
    expect(short.data.error.fields.description).toBe('Describe the voice in at least 20 characters.')
    await getDb().insert(schema.blockedVoice).values({ id: 'blk_design', name: 'Famous Anchor', aliases: [] }).onConflictDoNothing()
    const named = await call(design, { key: w.key, json: { description: 'Sounds exactly like Famous Anchor reading the news.' } })
    expect(named.data.error.code).toBe('blocked_description')
    const poor = await call(design, { key: w.key, json: { description: 'A bright, quick voice for a cartoon fox.' } })
    expect(poor.status).toBe(402)
  })
})

describe('Voice Changer', () => {
  it('re-voices an upload in a job and charges per started minute', async () => {
    const w = await workspaceWithKey({ credits: 5000 })
    const up = await uploadFile(w.key, await clip(8), { purpose: 'media', filename: 'take.wav' })
    const r = await call(changer, { key: w.key, json: { uploadId: up.id, voiceId: 'lib_atlas', format: 'wav', declaredMs: 8000 } })
    expect(r.status).toBe(202)
    await drainInline()
    const job = await call(jobRoute, { key: w.key, params: { id: r.data.id } })
    expect(job.data.status).toBe('succeeded')
    const g = await call(historyItem, { key: w.key, params: { id: job.data.output.generationId } })
    expect(g.data).toMatchObject({ module: 'changer', status: 'succeeded', credits: CREDIT_RATES.changerPerMinute, mimeType: 'audio/wav' })
    expect(g.data.durationMs).toBeGreaterThan(6000)
    expect((await getBalance(w.workspaceId)).total).toBe(5000 - CREDIT_RATES.changerPerMinute)
  })

  it('pre-checks credits from the declared length, and refunds when the job fails', async () => {
    const w = await workspaceWithKey({ credits: 500 })
    const up = await uploadFile(w.key, await clip(3), { purpose: 'media', filename: 'take.wav' })
    const early = await call(changer, { key: w.key, json: { uploadId: up.id, voiceId: 'lib_atlas', declaredMs: 3000 } })
    expect(early.status).toBe(402)

    // Declared nothing: the job measures, can't afford it, fails, and nothing is charged.
    const late = await call(changer, { key: w.key, json: { uploadId: up.id, voiceId: 'lib_atlas' } })
    expect(late.status).toBe(202)
    await drainInline()
    const job = await call(jobRoute, { key: w.key, params: { id: late.data.id } })
    expect(job.data.status).toBe('failed')
    expect(job.data.error).toMatch(/needs 1,000 credits and you have 500/)
    expect((await getBalance(w.workspaceId)).total).toBe(500)
  })

  it('needs the changer scope and a usable voice', async () => {
    const w = await workspaceWithKey({ scopes: ['tts'] })
    const r = await call(changer, { key: w.key, json: { uploadId: 'upl_x', voiceId: 'lib_atlas' } })
    expect(r.status).toBe(403)
    const ok = await workspaceWithKey()
    const missing = await call(changer, { key: ok.key, json: { uploadId: 'upl_x', voiceId: 'nope' } })
    expect(missing.status).toBe(404)
  })
})
