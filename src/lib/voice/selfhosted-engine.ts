import { designFromText, estimateVoiceParams, wavResult } from './mock-engine'
import { engineCopy, engineFetch, fromBase64, type FetchLike } from './http'
import {
  EngineError,
  type AudioResult, type CloneRequest, type DesignRequest, type EngineCapabilities, type EngineFeature, type EngineVoice,
  type IsolateRequest, type SynthesisRequest, type Transcript, type TranscribeRequest, type VoiceEngine,
} from './types'

/**
 * Self-hosted GPU engine (VoxCPM2, Apache-2.0; DECISIONS 2026-11-02), spoken to over the small
 * "Mimix engine protocol v1" that engines/voxcpm/server.py implements:
 *
 *   GET    /v1/health                 {ok, model, sampleRate, features[]}
 *   POST   /v1/tts                    JSON {text, voiceId?, language?, seed?, cfg?}    → audio/wav
 *   POST   /v1/tts/stream             same body                                       → audio/wav, chunked
 *   POST   /v1/voices                 multipart file (WAV), name, transcript?          → {voiceId}
 *   POST   /v1/voices/design          JSON {description, previewText, count, seed?}    → {voices:[{voiceId, audio}]}
 *   POST   /v1/voices/{id}/publish    JSON {name}                                      → {voiceId}
 *   DELETE /v1/voices/{id}                                                             → 204
 *   POST   /v1/transcribe             multipart file, language?, speakers?             → Transcript
 *   POST   /v1/isolate                multipart file                                   → audio/wav
 *
 * Auth: `Authorization: Bearer <SELF_HOSTED_ENGINE_TOKEN>`. Which optional endpoints the server
 * runs is set with SELF_HOSTED_FEATURES, so capabilities stay known without a network call.
 */
export interface SelfHostedConfig {
  /** Which model the server runs: VoxCPM2 (engines/voxcpm) or Chatterbox Multilingual (engines/chatterbox). */
  kind?: SelfHostedKind
  url: string
  token?: string
  /** Optional features the server runs (see SELF_HOSTED_FEATURE_NAMES). */
  features: SelfHostedFeature[]
  fetch?: FetchLike
}

export const SELF_HOSTED_FEATURE_NAMES = ['stream', 'clone', 'design', 'transcribe', 'isolate'] as const
export type SelfHostedKind = 'voxcpm' | 'chatterbox'

/** Chatterbox Multilingual's 23 languages (ISO 639-1), from its model card. */
export const CHATTERBOX_LANGUAGES = ['ar', 'da', 'de', 'el', 'en', 'es', 'fi', 'fr', 'he', 'hi', 'it', 'ja', 'ko', 'ms', 'nl', 'no', 'pl', 'pt', 'ru', 'sv', 'sw', 'tr', 'zh'] as const

/** The languages a self-hosted model speaks, or null when it reads any language it is given (VoxCPM2: 30). */
export function selfHostedLanguages(kind: SelfHostedKind = 'voxcpm'): readonly string[] | null {
  return kind === 'chatterbox' ? CHATTERBOX_LANGUAGES : null
}
export type SelfHostedFeature = (typeof SELF_HOSTED_FEATURE_NAMES)[number]

/** What the server can do, from its feature list (no network call). */
export function selfHostedCapabilities(features: readonly SelfHostedFeature[], kind: SelfHostedKind = 'voxcpm'): EngineCapabilities {
  const has = (f: SelfHostedFeature) => features.includes(f)
  return {
    models: [kind === 'chatterbox'
      ? { id: 'chatterbox-multilingual', name: 'Multilingual', languages: CHATTERBOX_LANGUAGES.length, latency: 'standard', default: true }
      : { id: 'voxcpm2', name: 'Standard', languages: 30, latency: 'standard', default: true }],
    // Chatterbox has no voice design from text and no streaming endpoint in our server.
    instantClone: has('clone'), professionalClone: false, design: kind === 'voxcpm' && has('design'),
    // VoxCPM2 conditions on a reference clip; it has no speaker embedding we could blend.
    mix: false, convert: false, soundEffects: false,
    transcribe: has('transcribe'), isolate: has('isolate'), streaming: kind === 'voxcpm', outputFormats: ['wav'],
  }
}

/** Library voices without an engine voice read with the server's built-in voices, picked by pitch. */
const LOW_VOICE_F0 = 165

export class SelfHostedEngine implements VoiceEngine {
  readonly id: SelfHostedKind
  readonly isMock = false
  readonly capabilities: EngineCapabilities
  readonly streamMimeType = 'audio/wav' as const
  private readonly base: string
  private readonly fetchImpl: FetchLike

  constructor(private readonly cfg: SelfHostedConfig) {
    this.base = cfg.url.replace(/\/$/, '')
    this.fetchImpl = cfg.fetch ?? ((u, i) => fetch(u, i))
    this.id = cfg.kind ?? 'voxcpm'
    this.capabilities = selfHostedCapabilities(cfg.features, this.id)
  }

  /** Whether this engine can read text in a language (BCP 47). */
  speaks(language: string): boolean {
    const l = selfHostedLanguages(this.id)
    return !l || l.includes(language.split('-')[0]!.toLowerCase())
  }

  private auth(): Record<string, string> { return this.cfg.token ? { Authorization: `Bearer ${this.cfg.token}` } : {} }

  private call(path: string, init: RequestInit, timeoutMs?: number) {
    const json = typeof init.body === 'string'
    return engineFetch(this.fetchImpl, this.id, `${this.base}${path}`, { ...init, headers: { ...this.auth(), ...(json ? { 'Content-Type': 'application/json' } : {}) } }, timeoutMs)
  }

  private async json<T>(path: string, init: RequestInit, timeoutMs?: number): Promise<T> {
    const res = await this.call(path, init, timeoutMs)
    try { return (await res.json()) as T } catch { throw new EngineError(engineCopy().unexpected, true, 502) }
  }

  private async wav(res: Response): Promise<AudioResult> {
    try { return wavResult(new Uint8Array(await res.arrayBuffer())) } catch { throw new EngineError(engineCopy().unexpected, true, 502) }
  }

  private require(f: EngineFeature) {
    if (!this.capabilities[f]) throw new EngineError(engineCopy().unsupported, false, 501)
  }

  body(req: SynthesisRequest) {
    const voiceId = req.engineVoiceId || (req.voice.f0 < LOW_VOICE_F0 ? 'builtin-low' : 'builtin-high')
    // Similarity raises classifier-free guidance (closer to the reference, less varied): 1.5 to 3.
    const sim = req.settings?.similarity
    return JSON.stringify({
      text: req.text, voiceId, ...(req.language ? { language: req.language } : {}), ...(req.seed ? { seed: req.seed } : {}),
      ...(sim !== undefined ? { cfg: Math.round((1.5 + 1.5 * Math.min(1, Math.max(0, sim))) * 100) / 100 } : {}),
    })
  }

  async synthesize(req: SynthesisRequest): Promise<AudioResult> {
    if (!req.text.trim()) throw new EngineError(engineCopy().rejected, false, 422)
    return this.wav(await this.call('/v1/tts', { method: 'POST', body: this.body(req) }, 300_000))
  }

  async *stream(req: SynthesisRequest): AsyncIterable<Uint8Array> {
    if (!this.cfg.features.includes('stream')) { yield (await this.synthesize(req)).audio; return }
    const res = await this.call('/v1/tts/stream', { method: 'POST', body: this.body(req) }, 300_000)
    if (!res.body) throw new EngineError(engineCopy().unexpected, true, 502)
    const reader = res.body.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) return
        if (value?.length) yield value
      }
    } finally {
      reader.releaseLock()
    }
  }

  async clone(req: CloneRequest): Promise<EngineVoice> {
    this.require('instantClone')
    if (req.kind !== 'instant') throw new EngineError(engineCopy().unsupported, false, 501)
    const form = new FormData()
    req.samples.forEach((s, i) => form.append('file', new Blob([s as BlobPart], { type: 'audio/wav' }), `sample-${i + 1}.wav`))
    form.append('name', req.name.slice(0, 100))
    if (req.language) form.append('language', req.language)
    const r = await this.json<{ voiceId?: string }>('/v1/voices', { method: 'POST', body: form }, 300_000)
    if (!r.voiceId) throw new EngineError(engineCopy().cloneRejected, false, 422)
    return { params: estimateVoiceParams(req.samples, req.kind), engineVoiceId: r.voiceId }
  }

  async design(req: DesignRequest): Promise<EngineVoice[]> {
    this.require('design')
    const count = Math.min(3, Math.max(1, Math.floor(req.count ?? 3)))
    const r = await this.json<{ voices?: Array<{ voiceId?: string; audio?: string }> }>('/v1/voices/design', {
      method: 'POST',
      body: JSON.stringify({ description: req.description.slice(0, 1000), previewText: req.previewText ?? '', count, ...(req.language ? { language: req.language } : {}), ...(req.seed ? { seed: req.seed } : {}) }),
    }, 300_000)
    const voices = (r.voices ?? []).filter((v): v is { voiceId: string; audio?: string } => !!v.voiceId)
    if (!voices.length) throw new EngineError(engineCopy().unexpected, true, 502)
    return voices.map((v, i) => {
      let preview: AudioResult | undefined
      if (v.audio) { try { preview = wavResult(fromBase64(v.audio)) } catch { preview = undefined } }
      return { params: designFromText(req.description, i), engineVoiceId: v.voiceId, ...(preview ? { preview } : {}) }
    })
  }

  async publishVoice(engineVoiceId: string, meta: { name: string }): Promise<string> {
    const r = await this.json<{ voiceId?: string }>(`/v1/voices/${encodeURIComponent(engineVoiceId)}/publish`, { method: 'POST', body: JSON.stringify({ name: meta.name.slice(0, 100) }) })
    return r.voiceId ?? engineVoiceId
  }

  async deleteVoice(engineVoiceId: string): Promise<void> {
    try { await this.call(`/v1/voices/${encodeURIComponent(engineVoiceId)}`, { method: 'DELETE' }) } catch (err) {
      if ((err as EngineError).status === 404) return
      throw err
    }
  }

  async transcribe(req: TranscribeRequest): Promise<Transcript> {
    this.require('transcribe')
    const form = new FormData()
    form.append('file', new Blob([req.audio as BlobPart], { type: 'audio/wav' }), 'audio.wav')
    if (req.language) form.append('language', req.language)
    if (req.speakers) form.append('speakers', String(req.speakers))
    const r = await this.json<Transcript>('/v1/transcribe', { method: 'POST', body: form }, 1_800_000)
    if (!Array.isArray(r.segments)) throw new EngineError(engineCopy().unexpected, true, 502)
    return { language: r.language || req.language || 'und', durationMs: r.durationMs ?? 0, segments: r.segments }
  }

  async isolate(req: IsolateRequest): Promise<AudioResult> {
    this.require('isolate')
    const form = new FormData()
    form.append('file', new Blob([req.audio as BlobPart], { type: 'audio/wav' }), 'audio.wav')
    return this.wav(await this.call('/v1/isolate', { method: 'POST', body: form }, 1_800_000))
  }

  async mix(): Promise<EngineVoice> { throw new EngineError(engineCopy().unsupported, false, 501) }
  async convert(): Promise<AudioResult> { throw new EngineError(engineCopy().unsupported, false, 501) }
  async soundEffect(): Promise<AudioResult> { throw new EngineError(engineCopy().unsupported, false, 501) }
}
