import 'server-only'
import { env } from '@/server/env'
import { KokoroEngine } from '@/lib/voice/kokoro-engine'
import { meanEmbedding as dspMean, SPEAKER_MATCH as DSP_MATCH, speakerEmbedding as dspEmbedding, speakerSimilarity as dspSimilarity, TAKEDOWN_MATCH as DSP_TAKEDOWN, type SpeakerEmbedding } from '@/server/speaker'

/** The neural verifier's pass mark when "Tune voice check" hasn't set one (CAM++ cosine similarity). */
export const NEURAL_MATCH_DEFAULT = 0.5

export interface VerifierInfo {
  kind: 'dsp' | 'neural'
  /** Fit for real people's voices (a neural model), so cloning may run on real engines. */
  productionReady: boolean
  model: string
  /** Pass mark for the consent check; the takedown match uses the same mark. */
  match: number
  takedown: number
  /** "2026-11-04 · 24 recordings, 4 people" when tuned on the Owner's recordings; null on the default. */
  tuned: string | null
}

/**
 * Which speaker verifier checks consent recordings. "dsp" is the acoustic stand-in in speaker.ts: fine
 * for the preview engine's synthetic voices, not for people. "neural" runs 3D-Speaker's CAM++ on the
 * Kokoro server (needs KOKORO_FEATURES=clone), with its pass mark tuned on real recordings.
 */
export function speakerVerifier(): VerifierInfo {
  const e = env()
  if (e.SPEAKER_VERIFIER === 'neural') {
    const features = e.KOKORO_FEATURES.split(',').map((f) => f.trim())
    const ready = Boolean(e.MIXER_ENGINE_URL) && features.includes('clone')
    const match = e.SPEAKER_MATCH ?? NEURAL_MATCH_DEFAULT
    return { kind: 'neural', productionReady: ready, model: 'campplus-voxceleb', match, takedown: match, tuned: e.SPEAKER_MATCH !== undefined ? e.SPEAKER_MATCH_TUNED ?? '' : null }
  }
  return { kind: 'dsp', productionReady: false, model: 'dsp', match: DSP_MATCH, takedown: DSP_TAKEDOWN, tuned: null }
}

let kokoro: KokoroEngine | undefined
/** Tests replace the server call. */
let embedOverride: ((wav: Uint8Array) => Promise<SpeakerEmbedding>) | undefined
export function setSpeakerEmbedderForTests(f: typeof embedOverride) { embedOverride = f }

/** The speaker's embedding in a 16-bit PCM WAV, from the configured verifier. voicedMs 0 = no speech. */
export async function embedSpeaker(wav: Uint8Array): Promise<SpeakerEmbedding> {
  if (embedOverride) return embedOverride(wav)
  const e = env()
  // The neural model runs only where the Kokoro server has the clone extra (for example, cloning on the
  // graphics card with CLONE_CONSENT=attest while Kokoro's own clone models are missing).
  if (e.SPEAKER_VERIFIER !== 'neural' || !e.MIXER_ENGINE_URL || !e.KOKORO_FEATURES.split(',').map((f) => f.trim()).includes('clone')) return dspEmbedding(wav)
  kokoro ??= new KokoroEngine({ url: e.MIXER_ENGINE_URL!, token: e.MIXER_ENGINE_TOKEN })
  return kokoro.speakerEmbedding(wav)
}

/** 0 (different people) to 1 (the same recording). Embeddings from different verifiers score 0. */
export function compareSpeakers(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0
  // The stand-in's fingerprint has 4 numbers; neural embeddings have length 1, so a dot product is the cosine.
  if (a.length <= 16) return dspSimilarity(a, b)
  let dot = 0; let na = 0; let nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i]! * b[i]!; na += a[i]! ** 2; nb += b[i]! ** 2 }
  return Math.round((dot / Math.sqrt(na * nb || 1)) * 1000) / 1000
}

/** One embedding for several samples: the average, made length 1 again for neural embeddings. */
export function meanSpeaker(list: number[][]): number[] {
  const m = dspMean(list)
  if (m.length <= 16) return m
  const n = Math.sqrt(m.reduce((t, x) => t + x * x, 0)) || 1
  return m.map((x) => Math.round((x / n) * 1e6) / 1e6)
}
