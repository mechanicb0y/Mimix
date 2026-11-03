import { describe, expect, it } from 'vitest'
import { POST as tts } from '@/app/api/v1/text-to-speech/route'
import { POST as ttsStream } from '@/app/api/v1/text-to-speech/stream/route'
import { GET as history } from '@/app/api/v1/history/route'
import { DELETE as deleteHistory } from '@/app/api/v1/history/[id]/route'
import { POST as addRule, GET as listRulesRoute } from '@/app/api/v1/pronunciation/route'
import { GET as media } from '@/app/api/media/[...key]/route'
import { getBalance } from '@/server/credits'
import { setVoiceEngineForTests } from '@/server/engine'
import { MockEngine } from '@/lib/voice/mock-engine'
import { EngineError } from '@/lib/voice/types'
import { checkProvenance } from '@/server/provenance'
import { applyPronunciation } from '@/lib/schemas/tts'
import { call, workspaceWithKey } from '../support/fixtures'

describe('Text to Speech API', () => {
  it('generates MP3, charges one credit per character, labels and fingerprints the file', async () => {
    const w = await workspaceWithKey({ credits: 1000 })
    const text = 'Hello from Mimix.'
    const r = await call(tts, { key: w.key, json: { text, voiceId: 'lib_wren', format: 'mp3' } })
    expect(r.status).toBe(201)
    expect(r.data).toMatchObject({ module: 'tts', status: 'succeeded', credits: text.length, mimeType: 'audio/mpeg' })
    expect(r.data.peaks.length).toBeGreaterThan(10)
    expect((await getBalance(w.workspaceId)).total).toBe(1000 - text.length)

    const url = new URL(r.data.audioUrl)
    const file = await call(media, { path: url.pathname + url.search, params: { key: url.pathname.replace('/api/media/', '').split('/') } })
    expect(file.status).toBe(200)
    expect(file.res.headers.get('content-type')).toBe('audio/mpeg')
    const bytes = new Uint8Array(await file.res.arrayBuffer())
    expect(String.fromCharCode(...bytes.subarray(0, 3))).toBe('ID3')
    const p = await checkProvenance(bytes)
    expect(p.fingerprintMatch?.generationId).toBe(r.data.id)
    expect(p.label?.generationId).toBe(r.data.id)
  })

  it('rejects an expired or tampered media link', async () => {
    const w = await workspaceWithKey()
    const r = await call(tts, { key: w.key, json: { text: 'Hi there', voiceId: 'lib_atlas', format: 'wav' } })
    const url = new URL(r.data.audioUrl)
    url.searchParams.set('s', 'tampered')
    const res = await call(media, { path: url.pathname + url.search, params: { key: url.pathname.replace('/api/media/', '').split('/') } })
    expect(res.status).toBe(403)
  })

  it('validates input with field messages', async () => {
    const w = await workspaceWithKey()
    const r = await call(tts, { key: w.key, json: { text: '   ', voiceId: '', settings: { stability: 2 } } })
    expect(r.status).toBe(422)
    expect(r.data.error.fields).toMatchObject({ text: expect.stringMatching(/text/i), voiceId: 'Choose a voice.', 'settings.stability': 'Choose a value from 0 to 1.' })
    const long = await call(tts, { key: w.key, json: { text: 'a'.repeat(5001), voiceId: 'lib_wren' } })
    expect(long.data.error.fields.text).toMatch(/longer than one take/)
  })

  it('returns 402 when credits run out and charges nothing', async () => {
    const w = await workspaceWithKey({ credits: 5 })
    const r = await call(tts, { key: w.key, json: { text: 'Too long for five credits', voiceId: 'lib_wren' } })
    expect(r.status).toBe(402)
    expect(r.data.error).toMatchObject({ code: 'insufficient_credits', needed: 25, available: 5 })
    expect((await getBalance(w.workspaceId)).total).toBe(5)
  })

  it('refunds credits when the engine fails', async () => {
    const w = await workspaceWithKey({ credits: 100 })
    const failing = new MockEngine()
    failing.synthesize = async () => { throw new EngineError('The engine is busy. Try again.', true, 503) }
    setVoiceEngineForTests(failing)
    try {
      const r = await call(tts, { key: w.key, json: { text: 'Hello', voiceId: 'lib_wren', format: 'wav' } })
      expect(r.status).toBe(502)
      expect((await getBalance(w.workspaceId)).total).toBe(100)
    } finally { setVoiceEngineForTests(undefined) }
  })

  it('needs the tts scope and a valid key', async () => {
    const w = await workspaceWithKey({ scopes: ['voices:read'] })
    expect((await call(tts, { key: w.key, json: { text: 'Hi', voiceId: 'lib_wren' } })).data.error.code).toBe('missing_scope')
    expect((await call(tts, { key: 'mmx_nope', json: { text: 'Hi', voiceId: 'lib_wren' } })).status).toBe(401)
  })

  it('rate-limits per key', async () => {
    const w = await workspaceWithKey({ rateLimitPerMinute: 2 })
    await call(history, { key: w.key }); await call(history, { key: w.key })
    const third = await call(history, { key: w.key })
    expect(third.status).toBe(429)
    expect(third.res.headers.get('retry-after')).toBeTruthy()
  })

  it('enforces an API key’s monthly credit cap', async () => {
    const w = await workspaceWithKey({ creditLimit: 10 })
    expect((await call(tts, { key: w.key, json: { text: 'Eight ch', voiceId: 'lib_wren', format: 'wav' } })).status).toBe(201)
    const r = await call(tts, { key: w.key, json: { text: 'Eight ch', voiceId: 'lib_wren', format: 'wav' } })
    expect(r.data.error.code).toBe('key_credit_limit')
  })

  it('streams audio', async () => {
    const w = await workspaceWithKey()
    const r = await call(ttsStream, { key: w.key, json: { text: 'Streaming test.', voiceId: 'lib_wren' } })
    expect(r.status).toBe(200)
    const bytes = new Uint8Array(await r.res.arrayBuffer())
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('RIFF')
  })

  it('lists and deletes history, newest first', async () => {
    const w = await workspaceWithKey()
    for (const text of ['One.', 'Two.']) await call(tts, { key: w.key, json: { text, voiceId: 'lib_wren', format: 'wav' } })
    const h = await call(history, { key: w.key, path: '/api/v1/history?module=tts' })
    expect(h.data.items.map((i: { text: string }) => i.text)).toEqual(['Two.', 'One.'])
    const del = await call(deleteHistory, { key: w.key, method: 'DELETE', params: { id: h.data.items[0].id } })
    expect(del.status).toBe(204)
    expect((await call(history, { key: w.key })).data.items).toHaveLength(1)
  })

  it('keeps a pronunciation dictionary per workspace', async () => {
    const w = await workspaceWithKey()
    expect((await call(addRule, { key: w.key, json: { term: 'Mimix', replacement: 'Mim-icks' } })).status).toBe(201)
    expect((await call(listRulesRoute, { key: w.key })).data.items).toHaveLength(1)
    expect(applyPronunciation('mimix and Mimix-style, not Mimixes', [{ term: 'Mimix', type: 'alias', replacement: 'Mim-icks', caseSensitive: false }]))
      .toBe('Mim-icks and Mim-icks-style, not Mimixes')
  })
})
