import { describe, expect, it } from 'vitest'
import { InworldEngine, inworldSegments } from '@/lib/voice/inworld-engine'
import { SelfHostedEngine } from '@/lib/voice/selfhosted-engine'
import { splitText } from '@/lib/voice/http'
import { decodeWav, encodeWav } from '@/lib/voice/wav'
import { EngineError, type VoiceParams } from '@/lib/voice/types'

const VOICE: VoiceParams = { f0: 120, formantShift: 1, rate: 4.4, breathiness: 0.1, brightness: 0.5, expressiveness: 0.5 }
const tone = (seconds: number, fs = 24000, hz = 140) => encodeWav(Float32Array.from({ length: Math.round(seconds * fs) }, (_, i) => 0.4 * Math.sin((2 * Math.PI * hz * i) / fs)), fs)
const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64')

interface Call { url: string; init: RequestInit }
/** A fetch stub that records calls and answers from a handler. */
function stub(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Call[] = []
  const fetch = async (url: string, init: RequestInit = {}) => { calls.push({ url, init }); return handler(url, init) }
  return { calls, fetch }
}
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } })
const inworld = (fetch: ReturnType<typeof stub>['fetch']) => new InworldEngine({ apiKey: 'a2V5', model: 'inworld-tts-2', sttModel: 'inworld/inworld-stt-1', voiceLow: 'Dennis', voiceHigh: 'Ashley', fetch })

describe('splitText', () => {
  it('keeps short text whole and splits long text at sentence ends', () => {
    expect(splitText('  Hello there.  ', 100)).toEqual(['Hello there.'])
    const parts = splitText('One two three. Four five six. Seven eight nine.', 30)
    expect(parts).toEqual(['One two three. Four five six.', 'Seven eight nine.'])
    expect(parts.every((p) => p.length <= 30)).toBe(true)
  })
  it('falls back to spaces, then hard cuts, and never loses text', () => {
    const long = `${'word '.repeat(30)}${'x'.repeat(70)}`
    const parts = splitText(long, 25)
    expect(parts.every((p) => p.length <= 25)).toBe(true)
    expect(parts.join('').replace(/\s/g, '')).toBe(long.replace(/\s/g, ''))
  })
})

describe('InworldEngine', () => {
  it('synthesizes with Basic auth, the stock voice nearest in pitch, and joins chunks past 2,000 characters', async () => {
    const s = stub(() => json({ audioContent: b64(tone(0.5)), usage: { processedCharactersCount: 10 } }))
    const e = inworld(s.fetch)
    const text = `${'This is a sentence that is about fifty characters. '.repeat(50)}`
    const out = await e.synthesize({ text, voice: VOICE, settings: { speed: 2, stability: 0.9 } })
    expect(s.calls.length).toBe(2)
    const first = s.calls[0]!
    expect(first.url).toBe('https://api.inworld.ai/tts/v1/voice')
    expect((first.init.headers as Record<string, string>).Authorization).toBe('Basic a2V5')
    const body = JSON.parse(first.init.body as string)
    expect(body).toMatchObject({ voiceId: 'Dennis', modelId: 'inworld-tts-2', deliveryMode: 'STABLE', audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000, speakingRate: 1.5 } })
    expect(body.text.length).toBeLessThanOrEqual(2000)
    expect(out.mimeType).toBe('audio/wav')
    expect(out.durationMs).toBe(1000)
    expect(out.peaks.length).toBe(96)
  })

  it('uses the voice’s own Inworld id and the higher stock voice for high voices', async () => {
    const s = stub(() => json({ audioContent: b64(tone(0.2)) }))
    const e = inworld(s.fetch)
    await e.synthesize({ text: 'Hi.', voice: VOICE, engineVoiceId: 'ws__abc' })
    await e.synthesize({ text: 'Hi.', voice: { ...VOICE, f0: 210 } })
    expect(JSON.parse(s.calls[0]!.init.body as string).voiceId).toBe('ws__abc')
    expect(JSON.parse(s.calls[1]!.init.body as string).voiceId).toBe('Ashley')
  })

  it('maps provider failures to user-safe, retryable or final errors', async () => {
    for (const [status, retryable] of [[429, true], [503, true], [400, false]] as const) {
      const e = inworld(stub(() => json({ code: 3, message: 'Unknown voice: John not found!' }, status)).fetch)
      const err = await e.synthesize({ text: 'Hi.', voice: VOICE }).catch((x: unknown) => x) as EngineError
      expect(err).toBeInstanceOf(EngineError)
      expect(err.retryable).toBe(retryable)
      expect(err.message).not.toContain('John')
    }
  })

  it('streams MP3 chunks from NDJSON and fails on a mid-stream error', async () => {
    const lines = [{ result: { audioContent: b64(new Uint8Array([1, 2])) } }, { result: { audioContent: b64(new Uint8Array([3])) } }]
    const body = (ls: unknown[]) => new Response(ls.map((l) => JSON.stringify(l)).join('\n') + '\n')
    const ok = inworld(stub(() => body(lines)).fetch)
    const got: number[] = []
    for await (const c of ok.stream({ text: 'Hello.', voice: VOICE })) got.push(...c)
    expect(got).toEqual([1, 2, 3])
    expect(ok.streamMimeType).toBe('audio/mpeg')

    const bad = inworld(stub(() => body([lines[0], { error: { code: 13, message: 'internal' } }])).fetch)
    await expect((async () => { for await (const _ of bad.stream({ text: 'Hello.', voice: VOICE })) void _ })()).rejects.toBeInstanceOf(EngineError)
  })

  it('clones from at most 30 s of joined samples and rejects samples Inworld flags', async () => {
    const s = stub(() => json({ voice: { voiceId: 'ws__clone1' }, audioSamplesValidated: [{ errors: [], warnings: [] }] }))
    const v = await inworld(s.fetch).clone({ samples: [tone(20, 16000), tone(20, 16000)], name: 'Ada', kind: 'instant', language: 'en-US' })
    expect(v.engineVoiceId).toBe('ws__clone1')
    expect(v.params.f0).toBeGreaterThan(100)
    const sent = JSON.parse(s.calls[0]!.init.body as string)
    expect(s.calls[0]!.url).toBe('https://api.inworld.ai/voices/v1/voices:clone')
    const wav = decodeWav(new Uint8Array(Buffer.from(sent.voiceSamples[0].audioData, 'base64')))
    expect(wav.samples.length / wav.sampleRate).toBe(30)
    expect(sent).toMatchObject({ displayName: 'Ada', languageCode: 'en-US', audioProcessingConfig: { removeBackgroundNoise: true } })

    const rejected = inworld(stub(() => json({ voice: { voiceId: 'x' }, audioSamplesValidated: [{ errors: ['too noisy'] }] })).fetch)
    await expect(rejected.clone({ samples: [tone(5)], name: 'Ada', kind: 'instant' })).rejects.toBeInstanceOf(EngineError)
    await expect(rejected.clone({ samples: [tone(5)], name: 'Ada', kind: 'professional' })).rejects.toMatchObject({ status: 501 })
  })

  it('designs drafts with WAV previews and publishes the chosen one', async () => {
    const s = stub((url) => url.endsWith(':publish')
      ? json({ voiceId: 'ws__pub' })
      : json({ previewVoices: [{ voiceId: 'ws__d1', previewAudio: b64(tone(1)) }, { voiceId: 'ws__d2', previewAudio: 'bm90IGF1ZGlv' }] }))
    const e = inworld(s.fetch)
    const out = await e.design({ description: 'warm narrator', previewText: 'Hello there.', count: 2 })
    expect(out.map((v) => v.engineVoiceId)).toEqual(['ws__d1', 'ws__d2'])
    expect(out[0]!.preview?.durationMs).toBe(1000)
    expect(out[1]!.preview).toBeUndefined()
    expect(JSON.parse(s.calls[0]!.init.body as string)).toMatchObject({ designPrompt: 'warm narrator', previewText: 'Hello there.', voiceDesignConfig: { numberOfSamples: 2 } })
    expect(await e.publishVoice('ws__d1', { name: 'Narrator' })).toBe('ws__pub')
    expect(s.calls[1]!.url).toBe('https://api.inworld.ai/voices/v1/voices/ws__d1:publish')
  })

  it('treats deleting a voice Inworld no longer has as done', async () => {
    await expect(inworld(stub(() => json({}, 404)).fetch).deleteVoice('ws__gone')).resolves.toBeUndefined()
    await expect(inworld(stub(() => json({}, 500)).fetch).deleteVoice('ws__x')).rejects.toBeInstanceOf(EngineError)
  })

  it('transcribes as multipart at 16 kHz and groups words into speaker segments', async () => {
    const s = stub(() => json({ transcription: { transcript: 'hi there yes', isFinal: true, wordTimestamps: [
      { word: 'hi', startTimeMs: 0, endTimeMs: 200, speaker: 0 }, { word: 'there', startTimeMs: 250, endTimeMs: 500, speaker: 0 },
      { word: 'yes', startTimeMs: 700, endTimeMs: 900, speaker: 1 },
    ] } }))
    const t = await inworld(s.fetch).transcribe({ audio: tone(1, 44100), language: 'en' })
    expect(t.durationMs).toBe(1000)
    expect(t.segments).toEqual([
      { startMs: 0, endMs: 500, speaker: 'Speaker 1', text: 'hi there' },
      { startMs: 700, endMs: 900, speaker: 'Speaker 2', text: 'yes' },
    ])
    const form = s.calls[0]!.init.body as FormData
    const keys = [...form.keys()]
    expect(keys).toEqual(['transcribeConfig', 'file'])
    const cfg = JSON.parse(await (form.get('transcribeConfig') as Blob).text())
    expect(cfg).toMatchObject({ modelId: 'inworld/inworld-stt-1', audioEncoding: 'LINEAR16', sampleRateHertz: 16000, includeWordTimestamps: true, enableSpeakerDiarization: true, language: 'en' })
    expect(decodeWav(new Uint8Array(await (form.get('file') as Blob).arrayBuffer())).sampleRate).toBe(16000)
  })

  it('splits segments on long pauses and falls back to the plain transcript', () => {
    const segs = inworldSegments({ transcription: { wordTimestamps: [{ word: 'a', startTimeMs: 0, endTimeMs: 100 }, { word: 'b', startTimeMs: 2000, endTimeMs: 2100 }] } }, 5000)
    expect(segs.map((s) => [s.startMs, s.text])).toEqual([[5000, 'a'], [7000, 'b']])
    expect(inworldSegments({ transcription: { transcript: 'Hello.' } })).toEqual([{ startMs: 0, endMs: 0, speaker: 'Speaker 1', text: 'Hello.' }])
  })

  it('reports what it can’t do', async () => {
    const e = inworld(stub(() => json({})).fetch)
    expect(e.capabilities).toMatchObject({ mix: false, convert: false, soundEffects: false, isolate: false, transcribe: true, design: true, instantClone: true, professionalClone: false })
    await expect(e.mix()).rejects.toMatchObject({ status: 501 })
  })
})

describe('SelfHostedEngine (VoxCPM2 server)', () => {
  const make = (fetch: ReturnType<typeof stub>['fetch'], features: Array<'stream' | 'clone' | 'design' | 'transcribe' | 'isolate'> = ['stream', 'clone', 'design']) =>
    new SelfHostedEngine({ url: 'http://gpu.internal:8808/', token: 'secret-token-123456', features, fetch })

  it('synthesizes with a bearer token and built-in voices for library voices', async () => {
    const s = stub(() => new Response(tone(0.5) as BodyInit, { headers: { 'Content-Type': 'audio/wav' } }))
    const out = await make(s.fetch).synthesize({ text: 'Hello.', voice: VOICE, seed: 'g1', settings: { similarity: 1 } })
    expect(s.calls[0]!.url).toBe('http://gpu.internal:8808/v1/tts')
    expect((s.calls[0]!.init.headers as Record<string, string>).Authorization).toBe('Bearer secret-token-123456')
    expect(JSON.parse(s.calls[0]!.init.body as string)).toEqual({ text: 'Hello.', voiceId: 'builtin-low', seed: 'g1', cfg: 3 })
    expect(out.durationMs).toBe(500)
  })

  it('streams the server’s bytes, or falls back to one piece without the stream feature', async () => {
    const wav = tone(0.1)
    const s = stub(() => new Response(wav as BodyInit))
    const chunks: Uint8Array[] = []
    for await (const c of make(s.fetch).stream({ text: 'Hi.', voice: VOICE })) chunks.push(c)
    expect(s.calls[0]!.url).toBe('http://gpu.internal:8808/v1/tts/stream')
    expect(Buffer.concat(chunks).equals(Buffer.from(wav))).toBe(true)
    const s2 = stub(() => new Response(wav as BodyInit))
    for await (const c of make(s2.fetch, []).stream({ text: 'Hi.', voice: VOICE })) void c
    expect(s2.calls[0]!.url).toBe('http://gpu.internal:8808/v1/tts')
  })

  it('clones over multipart and refuses features the server doesn’t run', async () => {
    const s = stub(() => json({ voiceId: 'v_123' }))
    const e = make(s.fetch)
    expect((await e.clone({ samples: [tone(3, 16000)], name: 'Ada', kind: 'instant' })).engineVoiceId).toBe('v_123')
    expect([...(s.calls[0]!.init.body as FormData).keys()]).toEqual(['file', 'name'])
    expect(e.capabilities).toMatchObject({ instantClone: true, design: true, transcribe: false, isolate: false, mix: false })
    await expect(e.transcribe({ audio: tone(1) })).rejects.toMatchObject({ status: 501 })
    const bare = make(stub(() => json({})).fetch, [])
    await expect(bare.clone({ samples: [tone(3)], name: 'A', kind: 'instant' })).rejects.toMatchObject({ status: 501 })
  })

  it('maps an unreachable server to a retryable error', async () => {
    const e = make(async () => { throw new TypeError('fetch failed') })
    await expect(e.synthesize({ text: 'Hi.', voice: VOICE })).rejects.toMatchObject({ retryable: true, status: 503 })
  })
})
