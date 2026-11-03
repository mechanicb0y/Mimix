import { describe, expect, it } from 'vitest'
import { POST as stt } from '@/app/api/v1/speech-to-text/route'
import { GET as transcripts } from '@/app/api/v1/transcripts/route'
import { GET as transcript, PATCH as patchTranscript } from '@/app/api/v1/transcripts/[id]/route'
import { POST as sfx } from '@/app/api/v1/sound-effects/route'
import { POST as isolator } from '@/app/api/v1/voice-isolator/route'
import { GET as jobRoute } from '@/app/api/v1/jobs/[id]/route'
import { GET as historyItem } from '@/app/api/v1/history/[id]/route'
import { MockEngine } from '@/lib/voice/mock-engine'
import { LIBRARY_VOICES } from '@/config/voices'
import { CREDIT_RATES } from '@/config/plans'
import { getBalance } from '@/server/credits'
import { drainInline } from '@/server/jobs'
import { call, workspaceWithKey } from '../support/fixtures'
import { uploadFile } from '../support/uploads'

const engine = new MockEngine()
const talk = async () => (await engine.synthesize({ text: 'Good morning everyone. Thanks for joining. Today we talk about voices. Then we take questions.', voice: LIBRARY_VOICES[1]!.params, seed: 'stt' })).audio

describe('Speech to Text', () => {
  it('transcribes with timestamps and speakers, renames speakers, exports TXT/SRT/VTT', async () => {
    const w = await workspaceWithKey({ credits: 1000 })
    const up = await uploadFile(w.key, await talk(), { purpose: 'media', filename: 'Team call.wav' })
    const r = await call(stt, { key: w.key, json: { uploadId: up.id, speakers: 2 } })
    expect(r.status).toBe(202)
    await drainInline()
    const job = await call(jobRoute, { key: w.key, params: { id: r.data.id } })
    expect(job.data.status).toBe('succeeded')
    const id = job.data.output.generationId
    expect((await getBalance(w.workspaceId)).total).toBe(1000 - CREDIT_RATES.sttPerMinute)

    const t = await call(transcript, { key: w.key, params: { id } })
    expect(t.data.title).toBe('Team call')
    expect(t.data.segments.length).toBeGreaterThan(0)
    expect(t.data.segments[0]).toMatchObject({ startMs: expect.any(Number), endMs: expect.any(Number), speaker: 'Speaker 1' })
    expect(t.data.audioUrl).toMatch(/\/api\/media\//)

    await call(patchTranscript, { key: w.key, method: 'PATCH', params: { id }, json: { speakerNames: { 'Speaker 1': 'Dana' } } })
    const srt = await call(transcript, { key: w.key, params: { id }, path: `/api/v1/transcripts/${id}?format=srt` })
    expect(srt.res.headers.get('content-disposition')).toBe('attachment; filename="Team-call.srt"')
    expect(await srt.res.text()).toMatch(/^1\n00:00:\d\d,\d{3} --> 00:00:\d\d,\d{3}\nDana: /)
    const vtt = await call(transcript, { key: w.key, params: { id }, path: `/api/v1/transcripts/${id}?format=vtt` })
    expect(await vtt.res.text()).toMatch(/^WEBVTT\n\n/)
    const list = await call(transcripts, { key: w.key })
    expect(list.data.items[0]).toMatchObject({ id, title: 'Team call', status: 'succeeded' })
  })

  it('needs the stt scope', async () => {
    const w = await workspaceWithKey({ scopes: ['tts'] })
    expect((await call(stt, { key: w.key, json: { uploadId: 'x' } })).status).toBe(403)
  })
})

describe('Sound Effects', () => {
  it('generates a labelled effect for the flat rate, validates length and prompt', async () => {
    const w = await workspaceWithKey({ credits: 1000 })
    const r = await call(sfx, { key: w.key, json: { prompt: 'Heavy rain on a tin roof', seconds: 3, format: 'wav' } })
    expect(r.status).toBe(201)
    expect(r.data).toMatchObject({ module: 'sfx', credits: CREDIT_RATES.soundEffectPerGeneration, mimeType: 'audio/wav' })
    expect(r.data.durationMs).toBe(3000)
    const bad = await call(sfx, { key: w.key, json: { prompt: '', seconds: 99 } })
    expect(bad.data.error.fields).toMatchObject({ prompt: 'Describe the sound.', seconds: 'Choose a length the model supports.' })
  })
})

describe('Voice Isolator', () => {
  it('cleans an upload in a job, charges per minute, and does not label it as AI speech', async () => {
    const w = await workspaceWithKey({ credits: 3000 })
    const up = await uploadFile(w.key, await talk(), { purpose: 'media', filename: 'noisy.wav' })
    const r = await call(isolator, { key: w.key, json: { uploadId: up.id, format: 'wav' } })
    await drainInline()
    const job = await call(jobRoute, { key: w.key, params: { id: r.data.id } })
    expect(job.data.status).toBe('succeeded')
    const g = await call(historyItem, { key: w.key, params: { id: job.data.output.generationId } })
    expect(g.data).toMatchObject({ module: 'isolator', credits: CREDIT_RATES.isolatorPerMinute })
    const url = new URL(g.data.audioUrl)
    const { GET: media } = await import('@/app/api/media/[...key]/route')
    const file = await call(media, { path: url.pathname + url.search, params: { key: url.pathname.replace('/api/media/', '').split('/') } })
    const text = Buffer.from(await file.res.arrayBuffer()).toString('latin1')
    expect(text).not.toContain('AI-generated')
  })
})
