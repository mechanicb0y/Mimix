/**
 * Provider-agnostic voice engine contract (brief section 4, Phase 4 "Voice engine").
 * Phase 3 ships the MockEngine; Phase 4 adds a commercial adapter and a self-hosted GPU adapter
 * behind the same interface, picked with the VOICE_ENGINE environment variable.
 */

/** Acoustic parameters that describe a voice to the mock engine and to the Voice Mixer. */
export interface VoiceParams {
  /** Base pitch in Hz (adult range 80 to 260). */
  f0: number
  /** Formant scale: 1 = average adult, below 1 = larger vocal tract (deeper), above 1 = smaller. */
  formantShift: number
  /** Syllables per second at speed 1. */
  rate: number
  /** Breath noise mixed into voiced sound, 0 to 1. */
  breathiness: number
  /** Spectral tilt: 0 = dark and warm, 1 = bright. */
  brightness: number
  /** Pitch movement across a sentence, 0 = flat, 1 = very expressive. */
  expressiveness: number
}

export interface VoiceSettings {
  /** 0 to 1. Higher keeps pitch steadier between takes. */
  stability?: number
  /** 0 to 1. How closely output follows the voice's own timbre. */
  similarity?: number
  /** 0 to 1. Exaggerates the voice's expressive range. */
  style?: number
  /** 0.7 to 1.2. Speaking rate multiplier. */
  speed?: number
}

export type AudioFormat = 'wav' | 'mp3'
export type AudioMime = 'audio/wav' | 'audio/mpeg'

/** A voice as an engine knows it: our acoustic description, plus the engine's own id when it has one. */
export interface EngineVoice {
  params: VoiceParams
  /** The provider's voice id (cloned or designed voices on real engines). Mock voices have none. */
  engineVoiceId?: string | null
  /** Audio the engine already made while creating the voice (design previews), so it isn't synthesized twice. */
  preview?: AudioResult
  /** What the engine made it as (Voice Design), for the library's filters. */
  labels?: { gender?: 'female' | 'male' | 'neutral'; age?: 'young' | 'middle' | 'older'; accent?: string }
}

export interface SynthesisRequest {
  text: string
  voice: VoiceParams
  /** Provider voice id; real engines use it instead of `voice`. */
  engineVoiceId?: string | null
  /** Model id from the engine's model list; the engine default when omitted. */
  model?: string
  /** BCP 47 language hint. */
  language?: string
  settings?: VoiceSettings
  format?: AudioFormat
  /** Optional seed so the same request always returns the same audio. */
  seed?: string
}

export interface AudioResult {
  audio: Uint8Array
  mimeType: AudioMime
  sampleRate: number
  durationMs: number
  /** Normalised loudness per bar (0 to 1) for drawing a waveform without decoding the audio. */
  peaks: number[]
}

export interface MixSource {
  voice: VoiceParams
  /** The source's engine voice (on the Kokoro mixer, its recipe). */
  engineVoiceId?: string | null
  /** Relative weight; weights are normalised so they sum to 1. */
  weight: number
}

export interface MixRequest {
  sources: MixSource[]
  /** Fine-tuning applied after the blend. Each is -1 to 1, 0 = unchanged. */
  adjust?: { pitch?: number; pace?: number; warmth?: number }
}

export interface DesignRequest {
  /** Free text such as "warm older narrator with a soft Scottish accent". */
  description: string
  /** How many candidate voices to return (1 to 3). */
  count?: number
  /** The line each candidate reads in its preview. */
  previewText?: string
  /** BCP 47 language of the preview line. */
  language?: string
  seed?: string
  /** Traits picked in the form; engines that design from text may ignore them. */
  traits?: import('./kokoro-design').VoiceTraits
}

export interface CloneRequest {
  /** Speaker audio as 16-bit PCM WAV (uploads are converted first). */
  samples: Uint8Array[]
  name: string
  /** Professional clones fine-tune on long recordings; instant clones condition on short samples. */
  kind: 'instant' | 'professional'
  language?: string
}

export interface ConvertRequest {
  /** Source speech as 16-bit PCM WAV. */
  audio: Uint8Array
  target: VoiceParams
  /** Provider voice id of the target, when the engine has one. */
  engineVoiceId?: string | null
}

export interface TranscriptSegment {
  startMs: number
  endMs: number
  speaker: string
  text: string
}

export interface Transcript {
  language: string
  durationMs: number
  segments: TranscriptSegment[]
}

export interface SoundEffectRequest {
  prompt: string
  /** Length in seconds; the engine picks one when omitted. */
  seconds?: number
  /** 0 to 1: how literally to follow the prompt. */
  promptInfluence?: number
  seed?: string
}

export interface IsolateRequest {
  /** 16-bit PCM WAV. */
  audio: Uint8Array
}

export interface EngineModel { id: string; name: string; languages: number | null; latency: 'fast' | 'standard'; default?: boolean }

/** What an engine supports, so the UI can hide what it cannot do. */
export interface EngineCapabilities {
  models: EngineModel[]
  instantClone: boolean
  professionalClone: boolean
  design: boolean
  mix: boolean
  convert: boolean
  transcribe: boolean
  soundEffects: boolean
  isolate: boolean
  streaming: boolean
  outputFormats: AudioFormat[]
}

export interface TranscribeRequest {
  audio: Uint8Array
  /** BCP 47 hint; detected when omitted. */
  language?: string
  /** Expected number of speakers; the mock engine alternates labels per pause. */
  speakers?: number
}

export interface VoiceEngine {
  readonly id: string
  /** True for development stand-ins, so the UI can say the audio is a preview engine. */
  readonly isMock: boolean
  readonly capabilities: EngineCapabilities
  /** Content type of the bytes `stream` yields. */
  readonly streamMimeType: AudioMime
  synthesize(req: SynthesisRequest): Promise<AudioResult>
  stream(req: SynthesisRequest): AsyncIterable<Uint8Array>
  clone(req: CloneRequest): Promise<EngineVoice>
  mix(req: MixRequest): Promise<EngineVoice>
  design(req: DesignRequest): Promise<EngineVoice[]>
  convert(req: ConvertRequest): Promise<AudioResult>
  transcribe(req: TranscribeRequest): Promise<Transcript>
  soundEffect(req: SoundEffectRequest): Promise<AudioResult>
  isolate(req: IsolateRequest): Promise<AudioResult>
  /** Removes a cloned or designed voice from the provider (deletion and takedown). */
  deleteVoice(engineVoiceId: string): Promise<void>
  /**
   * Keeps a designed candidate for good (engines that create design candidates as drafts).
   * Returns the voice id to store, which may differ from the draft id.
   */
  publishVoice?(engineVoiceId: string, meta: { name: string; description?: string }): Promise<string>
}

/** The capability flags a feature needs; used to hide and refuse features an engine lacks. */
export type EngineFeature = Exclude<keyof EngineCapabilities, 'models' | 'outputFormats'>

/** Raised by adapters with a user-safe reason; `retryable` tells the queue whether to try again. */
export class EngineError extends Error {
  constructor(message: string, public retryable = false, public status?: number) { super(message); this.name = 'EngineError' }
}
