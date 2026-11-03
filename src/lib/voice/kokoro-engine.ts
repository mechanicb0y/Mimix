import { blendVoices, wavResult } from './mock-engine'
import { engineCopy, engineFetch, type FetchLike } from './http'
import { designRecipes, KOKORO_DESIGN_LANGUAGES } from './kokoro-design'
import { kokoroCatalog } from '@/config/kokoro-catalog'
import {
  EngineError,
  type AudioResult, type CloneRequest, type DesignRequest, type VoiceParams, type EngineCapabilities, type EngineVoice, type IsolateRequest, type MixRequest, type SynthesisRequest,
  type TranscribeRequest, type Transcript, type VoiceEngine,
} from './types'

/**
 * Voice Mixer engine: our Kokoro-82M server (Apache-2.0; engines/kokoro). Kokoro describes each
 * library voice as a style tensor, and a weighted sum of two or three tensors is a new, natural
 * voice (go/no-go test, DECISIONS 2026-11-02). The server speaks "Mimix mixer protocol v1":
 *
 *   GET  /v1/health      {ok, model, sampleRate, voices, languages, features}
 *   POST /v1/tts         JSON {text, recipe, seed?}      → audio/wav
 *   POST /v1/transcribe  multipart file (+ language)     → transcript   (optional: faster-whisper)
 *   POST /v1/isolate     multipart file                  → audio/wav    (optional: DeepFilterNet)
 *   POST /v1/speaker     multipart file                  → {embedding, voicedMs, model}  (optional: clone)
 *   POST /v1/clone       multipart files                 → {tone, f0, seconds}          (optional: clone)
 *
 * It runs as the Voice Mixer next to another main engine (MIXER_ENGINE=kokoro), or as the main
 * engine itself (VOICE_ENGINE=kokoro): real voices on one computer, with no account and no
 * per-character cost. Library voices then speak through the Kokoro voices in config/kokoro-voices.
 *
 * A recipe names the blend and the fine-tuning, so a mix needs no state on the server:
 *   "af_heart:0.6,am_michael:0.4;speed=1.05;pitch=0.2;warmth=-0.1"
 * Weights sum to 1. speed is Kokoro's speaking rate; pitch (-1 to 1, about ±2 semitones) and
 * warmth (-1 to 1, a gentle low-shelf tilt) are applied to the audio afterwards.
 *
 * A cloned voice (KOKORO_FEATURES=clone) adds ";tone=<base64url>": the speaker's timbre as OpenVoice v2
 * reads it. Kokoro speaks with the blend, then the converter gives the speech the speaker's timbre.
 */
export const KOKORO_FEATURE_NAMES = ['transcribe', 'isolate', 'clone'] as const
export type KokoroFeature = (typeof KOKORO_FEATURE_NAMES)[number]

export interface KokoroConfig { url: string; token?: string; fetch?: FetchLike; features?: KokoroFeature[]; main?: boolean; consentNeedsStt?: boolean }

/** Languages Kokoro speaks: English (US, UK), Spanish, French, Hindi, Italian, Brazilian Portuguese (espeak-ng), Mandarin and Japanese (misaki). */
export const KOKORO_LANGUAGES = 8

/** Placeholder acoustic description for designed recipes (the mock engine's fields; Kokoro reads the recipe). */
const DESIGN_PARAMS: VoiceParams = { f0: 160, formantShift: 1, rate: 4.5, breathiness: 0.1, brightness: 0.5, expressiveness: 0.6 }

export const KOKORO_CAPABILITIES: EngineCapabilities = {
  models: [{ id: 'kokoro-82m', name: 'Mixer', languages: 1, latency: 'fast', default: true }],
  instantClone: false, professionalClone: false, design: false, mix: true, convert: false,
  transcribe: false, soundEffects: false, isolate: false, streaming: false, outputFormats: ['wav'],
}

/** Kokoro as the main engine, with the optional extras its server runs. */
export function kokoroMainCapabilities(features: readonly KokoroFeature[] = [], { consentNeedsStt = true } = {}): EngineCapabilities {
  return {
    ...KOKORO_CAPABILITIES,
    models: [{ id: 'kokoro-82m', name: 'Kokoro', languages: KOKORO_LANGUAGES, latency: 'fast', default: true }],
    transcribe: features.includes('transcribe'), isolate: features.includes('isolate'),
    // Voice Design as Mixer recipes (kokoro-design.ts): nothing to train, so always on.
    design: true,
    // Instant clones through OpenVoice v2. The read-aloud consent check hears the phrase with Speech to
    // Text, so then cloning needs transcribe too (not with CLONE_CONSENT=attest). Nothing is trained on
    // a CPU, so there are no professional clones.
    instantClone: features.includes('clone') && (features.includes('transcribe') || !consentNeedsStt),
  }
}

export interface Recipe { weights: Record<string, number>; speed: number; pitch: number; warmth: number; tone?: string }

const VOICE_ID = /^[a-z]{2}_[a-z]+$/
/** 256 float16 numbers in base64url (no padding). */
const TONE = /^[A-Za-z0-9_-]{683}$/
const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Parses a recipe; null when it isn't one (for example an engine voice id from another engine). */
export function parseRecipe(s: string | null | undefined): Recipe | null {
  if (!s) return null
  const [mix = '', ...opts] = s.split(';')
  const weights: Record<string, number> = {}
  for (const part of mix.split(',')) {
    const [id = '', w = ''] = part.split(':')
    const n = Number(w)
    if (!VOICE_ID.test(id) || !Number.isFinite(n) || n <= 0) return null
    weights[id] = (weights[id] ?? 0) + n
  }
  const total = Object.values(weights).reduce((t, w) => t + w, 0)
  if (!total) return null
  for (const k of Object.keys(weights)) weights[k] = weights[k]! / total
  const r: Recipe = { weights, speed: 1, pitch: 0, warmth: 0 }
  for (const o of opts) {
    const [k, v = ''] = o.split('=')
    if (k === 'tone') {
      if (!TONE.test(v)) return null
      r.tone = v
      continue
    }
    const n = Number(v)
    if (!Number.isFinite(n)) return null
    if (k === 'speed') r.speed = clamp(n, 0.5, 2)
    else if (k === 'pitch') r.pitch = clamp(n, -1, 1)
    else if (k === 'warmth') r.warmth = clamp(n, -1, 1)
    else return null
  }
  return r
}

export function formatRecipe(r: Recipe): string {
  const mix = Object.entries(r.weights).filter(([, w]) => w > 0).sort(([a], [b]) => a.localeCompare(b)).map(([id, w]) => `${id}:${round(w)}`).join(',')
  return `${mix};speed=${round(r.speed, 3)};pitch=${round(r.pitch, 3)};warmth=${round(r.warmth, 3)}${r.tone ? `;tone=${r.tone}` : ''}`
}

/**
 * The Kokoro voice a clone speaks through before the converter: one in the clone's language (English
 * when Kokoro doesn't speak it) whose pitch is closest to the speaker's, so the converter has the least
 * to change. f0 is the speaker's median pitch in Hz (0 when unknown: the middle of the range).
 */
export function cloneBase(f0: number, language = 'en'): string {
  const lang = KOKORO_DESIGN_LANGUAGES[language.split('-')[0]!.toLowerCase()] ? language.split('-')[0]!.toLowerCase() : 'en'
  const target = f0 > 0 ? f0 : 165
  const voices = kokoroCatalog().filter((v) => v.language === lang)
  // Pitch tells male from female voices best, so match it on a log scale.
  voices.sort((a, b) => Math.abs(Math.log(a.f0 / target)) - Math.abs(Math.log(b.f0 / target)) || a.kokoro.localeCompare(b.kokoro))
  return voices[0]!.kokoro
}

/** A single library voice as a recipe. */
export const voiceRecipe = (kokoroId: string) => formatRecipe({ weights: { [kokoroId]: 1 }, speed: 1, pitch: 0, warmth: 0 })

/**
 * Blends source recipes by weight. Mixes of mixes flatten to Kokoro voices, so a recipe never has
 * more than the voices it really uses. Fine-tuning: the sources' settings blend by weight, then the
 * mix's own adjustments (each -1 to 1) are added: pace ±25% speed, pitch and warmth on their scales.
 */
export function blendRecipes(sources: Array<{ recipe: Recipe; weight: number }>, adjust: MixRequest['adjust'] = {}): Recipe {
  const total = sources.reduce((t, s) => t + Math.max(0, s.weight), 0)
  if (sources.length < 2 || total <= 0) throw new EngineError(engineCopy().rejected, false, 422)
  const out: Recipe = { weights: {}, speed: 0, pitch: 0, warmth: 0 }
  for (const s of sources) {
    const w = Math.max(0, s.weight) / total
    for (const [id, v] of Object.entries(s.recipe.weights)) out.weights[id] = (out.weights[id] ?? 0) + v * w
    out.speed += s.recipe.speed * w
    out.pitch += s.recipe.pitch * w
    out.warmth += s.recipe.warmth * w
  }
  out.speed = clamp(out.speed * (1 + 0.25 * (adjust.pace ?? 0)), 0.5, 2)
  out.pitch = clamp(out.pitch + (adjust.pitch ?? 0), -1, 1)
  out.warmth = clamp(out.warmth + (adjust.warmth ?? 0), -1, 1)
  return out
}

export class KokoroEngine implements VoiceEngine {
  readonly id = 'kokoro'
  readonly isMock = false
  readonly capabilities: EngineCapabilities
  readonly streamMimeType = 'audio/wav' as const
  private readonly base: string
  private readonly fetchImpl: FetchLike

  constructor(private readonly cfg: KokoroConfig) {
    this.base = cfg.url.replace(/\/$/, '')
    this.fetchImpl = cfg.fetch ?? ((u, i) => fetch(u, i))
    this.capabilities = cfg.main ? kokoroMainCapabilities(cfg.features, { consentNeedsStt: cfg.consentNeedsStt }) : KOKORO_CAPABILITIES
  }

  private auth(): Record<string, string> {
    return this.cfg.token ? { Authorization: `Bearer ${this.cfg.token}` } : {}
  }

  private form(audio: Uint8Array): FormData {
    const form = new FormData()
    form.append('file', new Blob([audio as BlobPart], { type: 'audio/wav' }), 'audio.wav')
    return form
  }

  private unsupported(): never { throw new EngineError(engineCopy().unsupported, false, 501) }

  async synthesize(req: SynthesisRequest): Promise<AudioResult> {
    if (!req.text.trim()) throw new EngineError(engineCopy().rejected, false, 422)
    const recipe = parseRecipe(req.engineVoiceId)
    // No recipe: a voice with no Kokoro voice (for example a library voice in a language Kokoro doesn't speak).
    if (!recipe) throw new EngineError(engineCopy().voiceUnavailable, false, 422)
    // The voice's own speed, times the request's speed setting (0.7 to 1.2).
    const speed = clamp(recipe.speed * (req.settings?.speed ?? 1), 0.5, 2)
    const res = await engineFetch(this.fetchImpl, 'kokoro', `${this.base}/v1/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.auth() },
      body: JSON.stringify({
        text: req.text, recipe: formatRecipe({ ...recipe, speed }), ...(req.seed ? { seed: req.seed } : {}),
        // As the main engine, the text's language sets the pronunciation (a voice keeps its own accent).
        ...(this.cfg.main && req.language ? { language: req.language } : {}),
      }),
    }, 300_000)
    try { return wavResult(new Uint8Array(await res.arrayBuffer())) } catch { throw new EngineError(engineCopy().unexpected, true, 502) }
  }

  async *stream(req: SynthesisRequest): AsyncIterable<Uint8Array> {
    yield (await this.synthesize(req)).audio
  }

  /** Every source must carry a recipe (MixSource.engineVoiceId); the mix is a new recipe. */
  async mix(req: MixRequest): Promise<EngineVoice> {
    const sources = req.sources.map((s) => ({ recipe: parseRecipe(s.engineVoiceId), weight: s.weight }))
    // Cloned voices can't be mixed yet (their timbre comes from the converter, not a Kokoro voice).
    if (sources.some((s) => !s.recipe || s.recipe.tone)) throw new EngineError(engineCopy().unsupported, false, 501)
    const recipe = blendRecipes(sources as Array<{ recipe: Recipe; weight: number }>, req.adjust)
    return { params: blendVoices(req), engineVoiceId: formatRecipe(recipe) }
  }

  /**
   * Instant clone: the server reads the speaker's timbre (OpenVoice v2) and pitch from the samples; the
   * voice is a Kokoro base voice near that pitch plus the timbre, so nothing is stored on the server.
   */
  async clone(req: CloneRequest): Promise<EngineVoice> {
    if (!this.capabilities.instantClone || req.kind !== 'instant') this.unsupported()
    const form = new FormData()
    req.samples.forEach((s, i) => form.append('files', new Blob([s as BlobPart], { type: 'audio/wav' }), `sample-${i}.wav`))
    const res = await engineFetch(this.fetchImpl, 'kokoro', `${this.base}/v1/clone`, { method: 'POST', headers: this.auth(), body: form }, 600_000)
    let r: { tone?: string; f0?: number }
    try { r = await res.json() as typeof r } catch { throw new EngineError(engineCopy().unexpected, true, 502) }
    if (!r.tone || !TONE.test(r.tone)) throw new EngineError(engineCopy().unexpected, true, 502)
    const f0 = typeof r.f0 === 'number' && r.f0 > 0 ? r.f0 : 0
    const recipe: Recipe = { weights: { [cloneBase(f0, req.language)]: 1 }, speed: 1, pitch: 0, warmth: 0, tone: r.tone }
    return { params: { ...DESIGN_PARAMS, f0: f0 || DESIGN_PARAMS.f0 }, engineVoiceId: formatRecipe(recipe) }
  }

  /** The consent check's speaker embedding (CAM++ on the server), for SPEAKER_VERIFIER=neural. */
  async speakerEmbedding(wav: Uint8Array): Promise<{ v: number[]; voicedMs: number }> {
    const res = await engineFetch(this.fetchImpl, 'kokoro', `${this.base}/v1/speaker`, { method: 'POST', headers: this.auth(), body: this.form(wav) }, 120_000)
    let r: { embedding?: unknown; voicedMs?: unknown }
    try { r = await res.json() as typeof r } catch { throw new EngineError(engineCopy().unexpected, true, 502) }
    if (!Array.isArray(r.embedding) || typeof r.voicedMs !== 'number') throw new EngineError(engineCopy().unexpected, true, 502)
    return { v: r.embedding as number[], voicedMs: r.voicedMs }
  }
  /** Three Mixer recipes for a description, each with its preview (kokoro-design.ts). */
  async design(req: DesignRequest): Promise<EngineVoice[]> {
    if (!this.cfg.main) this.unsupported()
    let options
    try {
      options = designRecipes(kokoroCatalog(), req.traits ?? {}, { language: req.language, description: req.description, seed: req.seed })
    } catch (e) {
      if (e instanceof RangeError) throw new EngineError(engineCopy().designLanguage, false, 422)
      throw e
    }
    const text = req.previewText || ''
    const out: EngineVoice[] = []
    for (const o of options.slice(0, req.count ?? 3)) {
      const preview = await this.synthesize({ text, voice: DESIGN_PARAMS, engineVoiceId: o.recipe, language: req.language })
      out.push({ params: DESIGN_PARAMS, engineVoiceId: o.recipe, preview, labels: { gender: o.traits.gender === 'any' ? undefined : o.traits.gender, age: o.traits.age === 'any' ? undefined : o.traits.age, accent: o.traits.accent } })
    }
    return out
  }
  async convert(): Promise<AudioResult> { this.unsupported() }
  async soundEffect(): Promise<AudioResult> { this.unsupported() }

  /** Speech to Text on the server's faster-whisper (CPU). No diarization: every line is "Speaker 1". */
  async transcribe(req: TranscribeRequest): Promise<Transcript> {
    if (!this.capabilities.transcribe) this.unsupported()
    const form = this.form(req.audio)
    if (req.language) form.append('language', req.language)
    const res = await engineFetch(this.fetchImpl, 'kokoro', `${this.base}/v1/transcribe`, { method: 'POST', headers: this.auth(), body: form }, 1_800_000)
    let r: Partial<Transcript>
    try { r = await res.json() as Partial<Transcript> } catch { throw new EngineError(engineCopy().unexpected, true, 502) }
    if (!Array.isArray(r.segments)) throw new EngineError(engineCopy().unexpected, true, 502)
    return { language: r.language || req.language || 'und', durationMs: r.durationMs ?? 0, segments: r.segments }
  }

  /** Voice Isolator on the server's DeepFilterNet (CPU). */
  async isolate(req: IsolateRequest): Promise<AudioResult> {
    if (!this.capabilities.isolate) this.unsupported()
    const res = await engineFetch(this.fetchImpl, 'kokoro', `${this.base}/v1/isolate`, { method: 'POST', headers: this.auth(), body: this.form(req.audio) }, 1_800_000)
    try { return wavResult(new Uint8Array(await res.arrayBuffer())) } catch { throw new EngineError(engineCopy().unexpected, true, 502) }
  }
  /** Recipes live in our database; there is nothing to delete on the server. */
  async deleteVoice(): Promise<void> {}
}
