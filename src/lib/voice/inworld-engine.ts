import { designFromText, estimateVoiceParams, joinWav, resample, wavResult } from './mock-engine'
import { decodeWav, encodeWav } from './wav'
import { engineCopy, engineFetch, fromBase64, ndjsonLines, splitText, toBase64, type FetchLike } from './http'
import {
  EngineError,
  type AudioResult, type CloneRequest, type DesignRequest, type EngineCapabilities, type EngineVoice,
  type SynthesisRequest, type Transcript, type TranscriptSegment,
  type TranscribeRequest, type VoiceEngine,
} from './types'

/**
 * Inworld adapter (commercial engine, DECISIONS 2026-11-02). Built on the public API reference at
 * docs.inworld.ai, read 2026-11-02:
 *   TTS      POST /tts/v1/voice          text ≤ 2,000 characters, LINEAR16 comes back as a WAV file
 *   Stream   POST /tts/v1/voice:stream   NDJSON lines {result:{audioContent}}, ≤ 4,000 characters
 *   Clone    POST /voices/v1/voices:clone           base64 WAV samples, audio past 30 s is ignored
 *   Design   POST /voices/v1/voices:design          draft voices with preview audio
 *   Publish  POST /voices/v1/voices/{id}:publish    keeps a draft voice
 *   Delete   DELETE /voices/v1/voices/{id}
 *   STT      POST /stt/v1/transcribe     multipart, ≤ 16 MiB per request, word timings and speakers
 * Auth is `Authorization: Basic <key>`; the key from the Inworld portal is already base64.
 * Inworld has no voice blending, voice conversion, sound effects or noise isolation API, so those
 * capabilities are off and Mimix hides the matching tools.
 */
export interface InworldConfig {
  apiKey: string
  /** Default TTS model, e.g. inworld-tts-2. */
  model: string
  sttModel: string
  /** Stock voices for library voices that have no Inworld voice of their own: lower and higher pitch. */
  voiceLow: string
  voiceHigh: string
  baseUrl?: string
  fetch?: FetchLike
}

export const INWORLD_SAMPLE_RATE = 24_000
const TTS_MAX_CHARS = 2_000
const STREAM_MAX_CHARS = 4_000
const CLONE_MAX_SECONDS = 30
const STT_SAMPLE_RATE = 16_000
/** 16 MiB request cap; 16 kHz 16-bit mono is 32 kB/s, so 8 minutes leaves room for the multipart wrapper. */
const STT_CHUNK_SECONDS = 480
/** Pitch below which a params-only voice reads with the lower stock voice. */
const LOW_VOICE_F0 = 165

export const INWORLD_CAPABILITIES: EngineCapabilities = {
  models: [
    { id: 'inworld-tts-2', name: 'Standard', languages: null, latency: 'standard', default: true },
    { id: 'inworld-tts-2-flash', name: 'Fast', languages: null, latency: 'fast' },
  ],
  instantClone: true, professionalClone: false, design: true, mix: false, convert: false, transcribe: true,
  soundEffects: false, isolate: false, streaming: true, outputFormats: ['wav'],
}

interface SynthesisBody {
  text: string; voiceId?: string; modelId: string; language?: string
  audioConfig: { audioEncoding: 'LINEAR16' | 'MP3'; sampleRateHertz: number; speakingRate?: number }
  deliveryMode?: 'STABLE' | 'BALANCED' | 'CREATIVE'
}

export class InworldEngine implements VoiceEngine {
  readonly id = 'inworld'
  readonly isMock = false
  readonly capabilities: EngineCapabilities
  readonly streamMimeType = 'audio/mpeg' as const
  private readonly base: string
  private readonly fetchImpl: FetchLike

  constructor(private readonly cfg: InworldConfig) {
    this.base = (cfg.baseUrl ?? 'https://api.inworld.ai').replace(/\/$/, '')
    this.fetchImpl = cfg.fetch ?? ((u, i) => fetch(u, i))
    const models = INWORLD_CAPABILITIES.models.map((m) => ({ ...m, default: m.id === cfg.model }))
    if (!models.some((m) => m.default)) models.unshift({ id: cfg.model, name: 'Standard', languages: null, latency: 'standard', default: true })
    this.capabilities = { ...INWORLD_CAPABILITIES, models }
  }

  private headers(json = true): Record<string, string> {
    return { Authorization: `Basic ${this.cfg.apiKey}`, ...(json ? { 'Content-Type': 'application/json' } : {}) }
  }

  private async json<T>(path: string, init: RequestInit, timeoutMs?: number): Promise<T> {
    const res = await engineFetch(this.fetchImpl, 'inworld', `${this.base}${path}`, { ...init, headers: { ...this.headers(typeof init.body === 'string'), ...(init.headers as Record<string, string> | undefined) } }, timeoutMs)
    try { return (await res.json()) as T } catch { throw new EngineError(engineCopy().unexpected, true, 502) }
  }

  /** The Inworld voice to read with: the voice's own, or a stock voice close to its pitch. */
  voiceFor(req: SynthesisRequest): string {
    return req.engineVoiceId || (req.voice.f0 < LOW_VOICE_F0 ? this.cfg.voiceLow : this.cfg.voiceHigh)
  }

  body(req: SynthesisRequest, text: string, encoding: 'LINEAR16' | 'MP3'): SynthesisBody {
    const model = req.model ?? this.cfg.model
    const speed = req.settings?.speed
    const b: SynthesisBody = {
      text, voiceId: this.voiceFor(req), modelId: model,
      audioConfig: { audioEncoding: encoding, sampleRateHertz: INWORLD_SAMPLE_RATE, ...(speed ? { speakingRate: Math.min(1.5, Math.max(0.5, speed)) } : {}) },
    }
    if (req.language) b.language = req.language
    // Our stability slider maps to TTS-2's delivery modes; other models ignore it.
    const st = req.settings?.stability
    if (st !== undefined && model.startsWith('inworld-tts-2')) b.deliveryMode = st >= 0.67 ? 'STABLE' : st <= 0.33 ? 'CREATIVE' : 'BALANCED'
    return b
  }

  async synthesize(req: SynthesisRequest): Promise<AudioResult> {
    const pieces = splitText(req.text, TTS_MAX_CHARS)
    if (!pieces.length) throw new EngineError(engineCopy().rejected, false, 422)
    const clips: Uint8Array[] = []
    for (const text of pieces) {
      const r = await this.json<{ audioContent?: string }>('/tts/v1/voice', { method: 'POST', body: JSON.stringify(this.body(req, text, 'LINEAR16')) })
      if (!r.audioContent) throw new EngineError(engineCopy().unexpected, true, 502)
      clips.push(fromBase64(r.audioContent))
    }
    try { return clips.length === 1 ? wavResult(clips[0]!) : joinWav(clips) } catch { throw new EngineError(engineCopy().unexpected, true, 502) }
  }

  /** MP3 frames as Inworld produces them; MP3 frames from consecutive requests concatenate cleanly. */
  async *stream(req: SynthesisRequest): AsyncIterable<Uint8Array> {
    const pieces = splitText(req.text, STREAM_MAX_CHARS)
    if (!pieces.length) throw new EngineError(engineCopy().rejected, false, 422)
    for (const text of pieces) {
      const res = await engineFetch(this.fetchImpl, 'inworld', `${this.base}/tts/v1/voice:stream`, { method: 'POST', headers: this.headers(), body: JSON.stringify(this.body(req, text, 'MP3')) }, 120_000)
      if (!res.body) throw new EngineError(engineCopy().unexpected, true, 502)
      for await (const raw of ndjsonLines(res.body)) {
        const line = raw.replace(/^[[,]\s*/, '').replace(/\s*]$/, '')
        if (!line) continue
        let msg: { result?: { audioContent?: string }; error?: { code?: number; message?: string } }
        try { msg = JSON.parse(line) } catch { throw new EngineError(engineCopy().unexpected, true, 502) }
        if (msg.error) {
          console.error('[inworld] stream error', msg.error)
          throw new EngineError(engineCopy().unavailable, true, 502)
        }
        if (msg.result?.audioContent) yield fromBase64(msg.result.audioContent)
      }
    }
  }

  async clone(req: CloneRequest): Promise<EngineVoice> {
    if (req.kind !== 'instant') throw new EngineError(engineCopy().unsupported, false, 501)
    if (!req.samples.length) throw new EngineError(engineCopy().cloneRejected, false, 422)
    // Inworld reads the first 30 s, so send the cleanest 30 s we have: the samples joined, in order.
    const joined = decodeWav(joinWav(req.samples).audio)
    const sample = encodeWav(joined.samples.subarray(0, CLONE_MAX_SECONDS * joined.sampleRate), joined.sampleRate)
    const r = await this.json<{ voice?: { voiceId?: string }; audioSamplesValidated?: Array<{ errors?: unknown[]; warnings?: unknown[] }> }>('/voices/v1/voices:clone', {
      method: 'POST',
      body: JSON.stringify({
        displayName: req.name.slice(0, 100),
        ...(req.language ? { languageCode: req.language } : {}),
        voiceSamples: [{ audioData: toBase64(sample) }],
        audioProcessingConfig: { removeBackgroundNoise: true },
      }),
    }, 120_000)
    const problems = (r.audioSamplesValidated ?? []).flatMap((v) => v.errors ?? [])
    if (problems.length || !r.voice?.voiceId) {
      if (problems.length) console.error('[inworld] clone sample errors', JSON.stringify(problems).slice(0, 500))
      throw new EngineError(engineCopy().cloneRejected, false, 422)
    }
    return { params: estimateVoiceParams(req.samples, req.kind), engineVoiceId: r.voice.voiceId }
  }

  async design(req: DesignRequest): Promise<EngineVoice[]> {
    const count = Math.min(3, Math.max(1, Math.floor(req.count ?? 3)))
    const r = await this.json<{ previewVoices?: Array<{ voiceId?: string; previewAudio?: string }> }>('/voices/v1/voices:design', {
      method: 'POST',
      body: JSON.stringify({
        designPrompt: req.description.slice(0, 1000),
        ...(req.previewText ? { previewText: req.previewText } : {}),
        ...(req.language ? { languageCode: req.language } : {}),
        voiceDesignConfig: { numberOfSamples: count },
      }),
    }, 120_000)
    const voices = (r.previewVoices ?? []).filter((v): v is { voiceId: string; previewAudio?: string } => !!v.voiceId)
    if (!voices.length) throw new EngineError(engineCopy().unexpected, true, 502)
    return voices.map((v, i) => {
      // The preview's format isn't documented; use it when it is WAV, otherwise Mimix synthesizes one.
      let preview: AudioResult | undefined
      if (v.previewAudio) { try { preview = wavResult(fromBase64(v.previewAudio)) } catch { preview = undefined } }
      return { params: designFromText(req.description, i), engineVoiceId: v.voiceId, ...(preview ? { preview } : {}) }
    })
  }

  async publishVoice(engineVoiceId: string, meta: { name: string; description?: string }): Promise<string> {
    const r = await this.json<{ voiceId?: string }>(`/voices/v1/voices/${encodeURIComponent(engineVoiceId)}:publish`, {
      method: 'POST', body: JSON.stringify({ displayName: meta.name.slice(0, 100), ...(meta.description ? { description: meta.description.slice(0, 500) } : {}) }),
    })
    return r.voiceId ?? engineVoiceId
  }

  async deleteVoice(engineVoiceId: string): Promise<void> {
    try {
      await engineFetch(this.fetchImpl, 'inworld', `${this.base}/voices/v1/voices/${encodeURIComponent(engineVoiceId)}`, { method: 'DELETE', headers: this.headers(false) })
    } catch (err) {
      if ((err as EngineError).status === 404) return
      throw err
    }
  }

  async transcribe(req: TranscribeRequest): Promise<Transcript> {
    const d = decodeWav(req.audio)
    const pcm = resample(d.samples, d.sampleRate, STT_SAMPLE_RATE)
    const durationMs = Math.round((pcm.length / STT_SAMPLE_RATE) * 1000)
    const chunk = STT_CHUNK_SECONDS * STT_SAMPLE_RATE
    const segments: TranscriptSegment[] = []
    for (let start = 0; start < pcm.length; start += chunk) {
      const offsetMs = Math.round((start / STT_SAMPLE_RATE) * 1000)
      const wav = encodeWav(pcm.subarray(start, Math.min(pcm.length, start + chunk)), STT_SAMPLE_RATE)
      const config = {
        modelId: this.cfg.sttModel, audioEncoding: 'LINEAR16', sampleRateHertz: STT_SAMPLE_RATE, numberOfChannels: 1,
        includeWordTimestamps: true, enableSpeakerDiarization: req.speakers !== 1,
        ...(req.language ? { language: req.language } : {}),
      }
      const form = new FormData()
      form.append('transcribeConfig', new Blob([JSON.stringify(config)], { type: 'application/json' }))
      form.append('file', new Blob([wav as BlobPart], { type: 'audio/wav' }), 'audio.wav')
      const r = await this.json<InworldTranscription>('/stt/v1/transcribe', { method: 'POST', body: form }, 300_000)
      segments.push(...inworldSegments(r, offsetMs))
    }
    return { language: req.language ?? 'und', durationMs, segments }
  }

  async mix(): Promise<EngineVoice> { throw new EngineError(engineCopy().unsupported, false, 501) }
  async convert(): Promise<AudioResult> { throw new EngineError(engineCopy().unsupported, false, 501) }
  async soundEffect(): Promise<AudioResult> { throw new EngineError(engineCopy().unsupported, false, 501) }
  async isolate(): Promise<AudioResult> { throw new EngineError(engineCopy().unsupported, false, 501) }
}

export interface InworldTranscription {
  transcription?: {
    transcript?: string
    wordTimestamps?: Array<{ word: string; startTimeMs: number; endTimeMs: number; speaker?: number | null }>
  }
}

/** A new segment starts when the speaker changes or after a pause this long. */
const SEGMENT_GAP_MS = 1_000
const SEGMENT_MAX_WORDS = 40

/**
 * Turns Inworld word timings into transcript segments. Words without a speaker label stay with the
 * current segment. Speaker numbers are per request, so on files longer than one chunk the same
 * person may get a different label in later chunks (noted in DECISIONS).
 */
export function inworldSegments(r: InworldTranscription, offsetMs = 0): TranscriptSegment[] {
  const words = r.transcription?.wordTimestamps ?? []
  const text = r.transcription?.transcript?.trim() ?? ''
  if (!words.length) return text ? [{ startMs: offsetMs, endMs: offsetMs, speaker: 'Speaker 1', text }] : []
  const out: TranscriptSegment[] = []
  let cur: { speaker: number; start: number; end: number; words: string[] } | null = null
  for (const w of words) {
    const speaker: number = typeof w.speaker === 'number' ? w.speaker : cur?.speaker ?? 0
    if (!cur || speaker !== cur.speaker || w.startTimeMs - cur.end > SEGMENT_GAP_MS || cur.words.length >= SEGMENT_MAX_WORDS) {
      if (cur) out.push({ startMs: offsetMs + cur.start, endMs: offsetMs + cur.end, speaker: `Speaker ${cur.speaker + 1}`, text: cur.words.join(' ') })
      cur = { speaker, start: w.startTimeMs, end: w.endTimeMs, words: [] }
    }
    cur.words.push(w.word)
    cur.end = w.endTimeMs
  }
  if (cur) out.push({ startMs: offsetMs + cur.start, endMs: offsetMs + cur.end, speaker: `Speaker ${cur.speaker + 1}`, text: cur.words.join(' ') })
  return out
}
