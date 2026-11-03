/**
 * Speaker comparison used by the consent check (brief section 9) and the takedown match.
 *
 * This is the offline stand-in: a small acoustic fingerprint (median pitch plus the shape of the
 * average spectrum over voiced frames) compared with a distance score. It is good enough to tell
 * the preview engine's voices apart and to test the flow end to end. Production swaps it for a
 * neural speaker-verification model (for example an ECAPA-TDNN embedding) behind the same two
 * functions, chosen with SPEAKER_VERIFIER; thresholds are then re-tuned on real recordings.
 */
import { decodeWav } from '@/lib/voice/wav'
import { estimatePitch } from '@/lib/voice/mock-engine'

const N = 512
const BANDS = 16
const UPPER_FROM = 13

/** Hann-windowed magnitude spectrum of one frame (radix-2 FFT). */
function spectrum(frame: Float32Array): Float32Array {
  const re = new Float64Array(N); const im = new Float64Array(N)
  for (let i = 0; i < N; i++) re[i] = (frame[i] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)))
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [re[i], re[j]] = [re[j]!, re[i]!]; [im[i], im[j]] = [im[j]!, im[i]!] }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    for (let i = 0; i < N; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k); const wi = Math.sin(ang * k)
        const ar = re[i + k + len / 2]!; const ai = im[i + k + len / 2]!
        const tr = ar * wr - ai * wi; const ti = ar * wi + ai * wr
        re[i + k + len / 2] = re[i + k]! - tr; im[i + k + len / 2] = im[i + k]! - ti
        re[i + k] = re[i + k]! + tr; im[i + k] = im[i + k]! + ti
      }
    }
  }
  const mag = new Float32Array(N / 2)
  for (let i = 0; i < N / 2; i++) mag[i] = Math.hypot(re[i]!, im[i]!)
  return mag
}

/** Mel-spaced band edges (in FFT bins) from 80 Hz to 7.6 kHz. */
function bandEdges(fs: number): number[] {
  const mel = (f: number) => 2595 * Math.log10(1 + f / 700)
  const hz = (m: number) => 700 * (10 ** (m / 2595) - 1)
  const lo = mel(80); const hi = mel(Math.min(7600, fs / 2 - 1))
  return Array.from({ length: BANDS + 1 }, (_, i) => Math.round((hz(lo + ((hi - lo) * i) / BANDS) / fs) * N))
}

export interface SpeakerEmbedding { v: number[]; voicedMs: number }

/** Fingerprint of the speaker in a 16-bit PCM WAV. Returns voicedMs 0 when there is no speech. */
export function speakerEmbedding(wav: Uint8Array): SpeakerEmbedding {
  const { samples, sampleRate: fs } = decodeWav(wav)
  const hop = N / 2
  const energies: number[] = []
  for (let s = 0; s + N <= samples.length; s += hop) {
    let e = 0
    for (let i = 0; i < N; i++) e += samples[s + i]! ** 2
    energies.push(e / N)
  }
  const sorted = [...energies].sort((a, b) => a - b)
  const loud = sorted[Math.floor(sorted.length * 0.9)] ?? 0
  const gate = Math.max(1e-5, loud * 0.1)
  const edges = bandEdges(fs)
  const acc = new Float64Array(BANDS)
  let voiced = 0
  energies.forEach((e, f) => {
    if (e < gate) return
    const mag = spectrum(samples.subarray(f * hop, f * hop + N))
    for (let b = 0; b < BANDS; b++) {
      let sum = 0
      for (let k = edges[b]!; k < Math.max(edges[b]! + 1, edges[b + 1]!); k++) sum += mag[k]! ** 2
      acc[b]! += Math.log(sum + 1e-9)
    }
    voiced++
  })
  if (!voiced) return { v: [], voicedMs: 0 }
  const shape = Array.from(acc, (x) => x / voiced)
  const mean = shape.reduce((t, x) => t + x, 0) / BANDS
  // Level-independent spectral shape (a quiet and a loud recording of the same voice match).
  // Only the upper bands are kept: below about 3 kHz the shape follows the words (vowels) more than the speaker.
  const env = shape.map((x) => (x - mean) / 3).slice(UPPER_FROM)
  const f0 = estimatePitch(samples, fs)
  return { v: [Math.log2(f0 / 100) * 6, ...env], voicedMs: Math.round((voiced * hop * 1000) / fs) }
}

/** 0 (different speakers) to 1 (same recording). */
export function speakerSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0
  let d = 0
  for (let i = 0; i < a.length; i++) d += (a[i]! - b[i]!) ** 2
  return Math.round(Math.exp(-d / 0.08) * 1000) / 1000
}

/** Average of several sample embeddings (one per uploaded file). */
export function meanEmbedding(list: number[][]): number[] {
  const ok = list.filter((v) => v.length)
  if (!ok.length) return []
  return ok[0]!.map((_, i) => ok.reduce((t, v) => t + v[i]!, 0) / ok.length)
}

/** Pass marks. Tuned on the preview engine; re-tune with the production verifier. */
export const SPEAKER_MATCH = 0.75
export const TAKEDOWN_MATCH = 0.8
