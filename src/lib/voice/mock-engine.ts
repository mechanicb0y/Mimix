/**
 * MockEngine: a small source-filter speech synthesiser for local development and tests.
 * It does not speak real words. It turns text into voice-like syllables (glottal pulses shaped by
 * vowel formants, noise for consonants, pauses for punctuation), so every screen can be built and
 * tested with real audio, timing and waveforms before a commercial or GPU engine is connected.
 */
import { computePeaks, decodeWav, encodeWav } from './wav'
import { renderEffect, type MockEffect } from './mock-sfx'
import type {
  AudioResult, CloneRequest, ConvertRequest, DesignRequest, EngineCapabilities, EngineVoice, IsolateRequest, MixRequest,
  SoundEffectRequest, SynthesisRequest, TranscribeRequest, Transcript, VoiceEngine, VoiceParams,
} from './types'

export const MOCK_SAMPLE_RATE = 22050
export const MAX_MOCK_CHARS = 5000

/** Deterministic PRNG (mulberry32) seeded from a string. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Formants = [number, number, number]
const VOWELS: Record<string, Formants> = {
  a: [730, 1090, 2440], e: [530, 1840, 2480], i: [270, 2290, 3010],
  o: [570, 840, 2410], u: [300, 870, 2240], y: [300, 2100, 2900],
}
const NASAL: Formants = [260, 1150, 2400]
const LIQUID: Formants = [380, 1300, 2300]
const FRICATIVES = new Set(['s', 'f', 'h', 'z', 'v', 'x', 'c', 'j'])
const PLOSIVES = new Set(['p', 't', 'k', 'b', 'd', 'g', 'q'])
const NASALS = new Set(['m', 'n'])
const LIQUIDS = new Set(['l', 'r', 'w'])

type Segment =
  | { kind: 'voiced'; dur: number; formants: Formants; gain: number; stress: number }
  | { kind: 'noise'; dur: number; centre: number; gain: number }
  | { kind: 'silence'; dur: number; boundary: 'none' | 'word' | 'comma' | 'stop' | 'question' }

/** Splits text into timed segments. Durations are in seconds at speed 1. */
export function segmentText(text: string, voice: VoiceParams, rand: () => number): Segment[] {
  const syll = 1 / Math.max(2, voice.rate)
  const out: Segment[] = []
  const lower = text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  let vowelsInWord = 0
  for (let idx = 0; idx < lower.length; idx++) {
    const ch = lower[idx] ?? ' '
    if (VOWELS[ch]) {
      const prev = out[out.length - 1]
      // Merge vowel runs ("ea", "ou") into one longer syllable.
      if (prev && prev.kind === 'voiced' && prev.gain === 1) { prev.dur += syll * 0.18; continue }
      vowelsInWord++
      out.push({ kind: 'voiced', dur: syll * (0.48 + rand() * 0.14), formants: VOWELS[ch], gain: 1, stress: vowelsInWord === 1 ? 1 : 0.6 })
    } else if (NASALS.has(ch)) {
      out.push({ kind: 'voiced', dur: syll * 0.22, formants: NASAL, gain: 0.45, stress: 0.5 })
    } else if (LIQUIDS.has(ch)) {
      out.push({ kind: 'voiced', dur: syll * 0.16, formants: LIQUID, gain: 0.55, stress: 0.5 })
    } else if (FRICATIVES.has(ch)) {
      out.push({ kind: 'noise', dur: syll * 0.26, centre: ch === 's' || ch === 'z' || ch === 'c' ? 5200 : ch === 'h' ? 1600 : 3200, gain: ch === 'h' ? 0.12 : 0.2 })
    } else if (PLOSIVES.has(ch)) {
      out.push({ kind: 'silence', dur: syll * 0.12, boundary: 'none' })
      out.push({ kind: 'noise', dur: 0.022, centre: ch === 'k' || ch === 'g' || ch === 'q' ? 2200 : ch === 't' || ch === 'd' ? 4000 : 1200, gain: 0.3 })
    } else if (/[0-9]/.test(ch)) {
      out.push({ kind: 'voiced', dur: syll * 0.55, formants: VOWELS.e as Formants, gain: 1, stress: 0.8 })
    } else if (ch === ' ' || ch === '\n' || ch === '-') {
      vowelsInWord = 0
      out.push({ kind: 'silence', dur: syll * 0.28, boundary: 'word' })
    } else if (ch === ',' || ch === ';' || ch === ':') {
      vowelsInWord = 0
      out.push({ kind: 'silence', dur: 0.22, boundary: 'comma' })
    } else if (ch === '.' || ch === '!') {
      vowelsInWord = 0
      out.push({ kind: 'silence', dur: 0.42, boundary: 'stop' })
    } else if (ch === '?') {
      vowelsInWord = 0
      out.push({ kind: 'silence', dur: 0.42, boundary: 'question' })
    }
  }
  return out
}

interface Resonator { b0: number; b1: number; b2: number; y1: number; y2: number }
const resonator = (): Resonator => ({ b0: 0, b1: 0, b2: 0, y1: 0, y2: 0 })
function tune(r: Resonator, freq: number, bw: number, fs: number) {
  const rad = Math.exp((-Math.PI * bw) / fs)
  r.b1 = 2 * rad * Math.cos((2 * Math.PI * Math.min(freq, fs * 0.45)) / fs)
  r.b2 = -rad * rad
  r.b0 = 1 - rad
}
function step(r: Resonator, x: number): number {
  const y = r.b0 * x + r.b1 * r.y1 + r.b2 * r.y2
  r.y2 = r.y1; r.y1 = y
  return y
}

export function renderSpeech(req: SynthesisRequest, fs = MOCK_SAMPLE_RATE): Float32Array {
  const { voice } = req
  const s = req.settings ?? {}
  const speed = clamp(s.speed ?? 1, 0.7, 1.2)
  const stability = clamp(s.stability ?? 0.5, 0, 1)
  const style = clamp(s.style ?? 0, 0, 1)
  const rand = seededRandom(`${req.seed ?? ''}|${req.text}|${JSON.stringify(voice)}`)
  const segs = segmentText(req.text.slice(0, MAX_MOCK_CHARS), voice, rand)
  const total = Math.ceil((segs.reduce((t, g) => t + g.dur, 0) / speed + 0.3) * fs)
  const out = new Float32Array(total)

  const f = [resonator(), resonator(), resonator()]
  const noiseRes = resonator()
  const cur: Formants = [500, 1500, 2500]
  const fShift = voice.formantShift
  const expressive = clamp(voice.expressiveness * (0.6 + style * 0.8), 0, 1.4)
  const jitter = 0.012 * (1 - stability)
  let phase = 0
  let pos = Math.floor(0.12 * fs)
  let lp = 0
  // Sentence-level intonation: declination that resets after each stop.
  let sentenceStart = 0
  const sentenceEnds: number[] = []
  {
    let t = 0
    for (const g of segs) { t += g.dur / speed; if (g.kind === 'silence' && (g.boundary === 'stop' || g.boundary === 'question')) sentenceEnds.push(t) }
    sentenceEnds.push(t)
  }
  let sentenceIdx = 0
  let isQuestion = segs.some((g) => g.kind === 'silence' && g.boundary === 'question')

  for (const g of segs) {
    const n = Math.floor((g.dur / speed) * fs)
    if (g.kind === 'silence') {
      if (g.boundary === 'stop' || g.boundary === 'question') {
        sentenceStart = pos / fs; sentenceIdx++
        isQuestion = segs.slice(segs.indexOf(g) + 1).some((x) => x.kind === 'silence' && x.boundary === 'question')
      }
      pos += n
      continue
    }
    if (g.kind === 'noise') {
      tune(noiseRes, g.centre * Math.sqrt(fShift), g.centre * 0.6, fs)
      for (let i = 0; i < n && pos < total; i++, pos++) {
        const env = Math.sin((Math.PI * i) / n)
        out[pos] = (out[pos] ?? 0) + step(noiseRes, rand() * 2 - 1) * g.gain * env * 2.4
      }
      continue
    }
    const attack = Math.min(n / 3, 0.012 * fs)
    for (let i = 0; i < n && pos < total; i++, pos++) {
      const t = pos / fs
      const end = sentenceEnds[sentenceIdx] ?? t + 1
      const prog = clamp((t - sentenceStart) / Math.max(0.3, end - sentenceStart), 0, 1)
      let contour = 1 + expressive * 0.18 * (0.6 - prog) + g.stress * expressive * 0.06 * Math.sin((Math.PI * i) / n)
      if (isQuestion && prog > 0.8) contour += expressive * 0.5 * (prog - 0.8)
      const f0 = voice.f0 * contour * (1 + jitter * (rand() * 2 - 1))
      // Glide formants towards the target so vowels blend rather than click.
      for (let k = 0; k < 3; k++) cur[k] = (cur[k] as number) + (((g.formants[k] as number) * fShift) - (cur[k] as number)) * 0.0025
      if (i % 32 === 0) {
        tune(f[0] as Resonator, cur[0], 80, fs); tune(f[1] as Resonator, cur[1], 110, fs); tune(f[2] as Resonator, cur[2], 170, fs)
      }
      phase += f0 / fs
      if (phase >= 1) phase -= 1
      // Rosenberg-style glottal pulse: open phase rises then closes sharply.
      const open = 0.6
      const pulse = phase < open ? 0.5 * (1 - Math.cos((Math.PI * phase) / open)) : Math.max(0, Math.cos((Math.PI * (phase - open)) / (2 * (1 - open))))
      const source = (pulse - 0.45) * (1 - voice.breathiness * 0.6) + (rand() * 2 - 1) * voice.breathiness * 0.35
      const y = step(f[0] as Resonator, source) * 1.0 + step(f[1] as Resonator, source) * 0.55 + step(f[2] as Resonator, source) * (0.18 + voice.brightness * 0.25)
      const env = Math.min(1, i / attack, (n - i) / attack)
      out[pos] = (out[pos] ?? 0) + y * g.gain * env * 6
    }
  }

  // Gentle low-pass for warmth, then normalise to -3 dBFS.
  const alpha = 0.35 + voice.brightness * 0.4
  let peak = 1e-6
  for (let i = 0; i < out.length; i++) { lp += alpha * ((out[i] ?? 0) - lp); out[i] = lp; peak = Math.max(peak, Math.abs(lp)) }
  const gain = 0.707 / peak
  for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) * gain
  return out
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function toResult(samples: Float32Array, fs: number): AudioResult {
  return { audio: encodeWav(samples, fs), mimeType: 'audio/wav', sampleRate: fs, durationMs: Math.round((samples.length / fs) * 1000), peaks: computePeaks(samples) }
}

/** Weighted blend of voices: pitch blends on a log scale, everything else linearly. */
export function blendVoices(req: MixRequest): VoiceParams {
  const total = req.sources.reduce((t, s) => t + Math.max(0, s.weight), 0)
  if (req.sources.length < 2 || total <= 0) throw new Error('A mix needs at least two sources with a positive weight')
  const w = req.sources.map((s) => Math.max(0, s.weight) / total)
  const sum = (pick: (v: VoiceParams) => number) => req.sources.reduce((t, s, i) => t + pick(s.voice) * (w[i] as number), 0)
  const a = req.adjust ?? {}
  const blended: VoiceParams = {
    f0: Math.exp(sum((v) => Math.log(v.f0))),
    formantShift: sum((v) => v.formantShift),
    rate: sum((v) => v.rate),
    breathiness: sum((v) => v.breathiness),
    brightness: sum((v) => v.brightness),
    expressiveness: sum((v) => v.expressiveness),
  }
  return {
    f0: round(blended.f0 * Math.pow(2, clamp(a.pitch ?? 0, -1, 1) * 0.25)),
    formantShift: round(blended.formantShift),
    rate: round(blended.rate * (1 + clamp(a.pace ?? 0, -1, 1) * 0.2)),
    breathiness: round(clamp(blended.breathiness, 0, 1)),
    brightness: round(clamp(blended.brightness - clamp(a.warmth ?? 0, -1, 1) * 0.3, 0, 1)),
    expressiveness: round(blended.expressiveness),
  }
}
const round = (v: number) => Math.round(v * 1000) / 1000

const DESIGN_WORDS: Array<[RegExp, Partial<Record<keyof VoiceParams, number>>]> = [
  [/\b(deep|low|bass|baritone)\b/, { f0: -0.25, formantShift: -0.08 }],
  [/\b(high|bright|light)\b/, { f0: 0.2, brightness: 0.25 }],
  [/\b(child|kid|young|teen)\b/, { f0: 0.35, formantShift: 0.15, rate: 0.6 }],
  [/\b(old|older|elderly|aged|grandfather|grandmother)\b/, { rate: -0.8, breathiness: 0.15, expressiveness: -0.1 }],
  [/\b(warm|soft|gentle|calm|soothing)\b/, { brightness: -0.25, rate: -0.4, breathiness: 0.1 }],
  [/\b(energetic|excited|upbeat|lively|fast)\b/, { rate: 0.9, expressiveness: 0.3 }],
  [/\b(whisper|breathy|airy)\b/, { breathiness: 0.4 }],
  [/\b(robot|monotone|flat)\b/, { expressiveness: -0.4 }],
  [/\b(woman|female|feminine|she)\b/, { f0: 0.45, formantShift: 0.12 }],
  [/\b(man|male|masculine|he)\b/, { f0: -0.2, formantShift: -0.06 }],
  [/\b(narrator|storyteller|documentary)\b/, { rate: -0.3, expressiveness: 0.15 }],
]

export function designFromText(description: string, variant = 0): VoiceParams {
  const d = description.toLowerCase()
  const base: VoiceParams = { f0: 150, formantShift: 1, rate: 4.4, breathiness: 0.12, brightness: 0.5, expressiveness: 0.55 }
  for (const [re, delta] of DESIGN_WORDS) {
    if (!re.test(d)) continue
    if (delta.f0) base.f0 *= 1 + delta.f0
    if (delta.formantShift) base.formantShift += delta.formantShift
    if (delta.rate) base.rate += delta.rate
    if (delta.breathiness) base.breathiness += delta.breathiness
    if (delta.brightness) base.brightness += delta.brightness
    if (delta.expressiveness) base.expressiveness += delta.expressiveness
  }
  const r = seededRandom(`${d}#${variant}`)
  return {
    f0: round(clamp(base.f0 * (0.94 + r() * 0.12), 80, 300)),
    formantShift: round(clamp(base.formantShift + (r() - 0.5) * 0.06, 0.8, 1.3)),
    rate: round(clamp(base.rate + (r() - 0.5) * 0.4, 2.8, 6.2)),
    breathiness: round(clamp(base.breathiness, 0, 0.8)),
    brightness: round(clamp(base.brightness + (r() - 0.5) * 0.1, 0, 1)),
    expressiveness: round(clamp(base.expressiveness, 0, 1)),
  }
}

/** Estimates pitch by autocorrelation over voiced frames; used by clone and convert. */
export function estimatePitch(samples: Float32Array, fs: number): number {
  const frame = Math.floor(fs * 0.04)
  const minLag = Math.floor(fs / 320); const maxLag = Math.floor(fs / 70)
  const found: number[] = []
  for (let start = 0; start + frame + maxLag < samples.length; start += frame) {
    let energy = 0
    for (let i = 0; i < frame; i++) { const v = samples[start + i] ?? 0; energy += v * v }
    if (energy / frame < 0.002) continue
    let bestLag = 0; let best = 0
    for (let lag = minLag; lag <= maxLag; lag++) {
      let c = 0
      for (let i = 0; i < frame; i++) c += (samples[start + i] ?? 0) * (samples[start + i + lag] ?? 0)
      if (c > best) { best = c; bestLag = lag }
    }
    if (bestLag && best / energy > 0.3) found.push(fs / bestLag)
  }
  if (!found.length) return 150
  found.sort((x, y) => x - y)
  return found[Math.floor(found.length / 2)] as number
}

/**
 * Our acoustic description of a speaker from their samples. Real engines keep the voice themselves;
 * we still store these so the Mixer, previews and the library filters have something to work with.
 */
export function estimateVoiceParams(samples: Uint8Array[], kind: 'instant' | 'professional' = 'instant'): VoiceParams {
  const pitches = samples.map((b) => { const d = decodeWav(b); return estimatePitch(d.samples, d.sampleRate) })
  const f0 = pitches.reduce((t, p) => t + p, 0) / pitches.length
  return { f0: round(f0), formantShift: round(clamp(0.85 + (f0 - 90) / 600, 0.85, 1.25)), rate: 4.4, breathiness: 0.12, brightness: 0.5, expressiveness: kind === 'professional' ? 0.6 : 0.55 }
}

/** An AudioResult for 16-bit WAV bytes (any engine's output), with duration and waveform peaks. */
export function wavResult(bytes: Uint8Array): AudioResult {
  const { samples, sampleRate } = decodeWav(bytes)
  return { audio: bytes, mimeType: 'audio/wav', sampleRate, durationMs: Math.round((samples.length / sampleRate) * 1000), peaks: computePeaks(samples) }
}

/** Joins WAV clips (resampled to the first clip's rate if they differ) into one WAV result. */
export function joinWav(clips: Uint8Array[]): AudioResult {
  const decoded = clips.map((c) => decodeWav(c))
  const fs = decoded[0]?.sampleRate ?? 24000
  const parts = decoded.map((d) => (d.sampleRate === fs ? d.samples : resample(d.samples, d.sampleRate, fs)))
  const out = new Float32Array(parts.reduce((t, p) => t + p.length, 0))
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return toResult(out, fs)
}

/** Linear-interpolation resampler; good enough for speech going to STT or being joined. */
export function resample(samples: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return samples
  const out = new Float32Array(Math.floor((samples.length * to) / from))
  const step = from / to
  for (let i = 0; i < out.length; i++) {
    const x = i * step; const k = Math.floor(x); const f = x - k
    out[i] = (samples[k] ?? 0) * (1 - f) + (samples[k + 1] ?? samples[k] ?? 0) * f
  }
  return out
}

export const MOCK_CAPABILITIES: EngineCapabilities = {
  models: [
    { id: 'mock-v1', name: 'Preview', languages: null, latency: 'standard', default: true },
    { id: 'mock-fast', name: 'Preview Fast', languages: null, latency: 'fast' },
  ],
  instantClone: true, professionalClone: true, design: true, mix: true, convert: true, transcribe: true,
  soundEffects: true, isolate: true, streaming: true, outputFormats: ['wav'],
}

function effectFor(prompt: string): MockEffect {
  const p = prompt.toLowerCase()
  if (/rain|storm|drizzle|water|thunder/.test(p)) return 'rain'
  if (/door|knock|footstep|slam|wood/.test(p)) return 'door'
  if (/crowd|cafe|café|people|chatter|applause|restaurant/.test(p)) return 'crowd'
  if (/street|traffic|car|city|engine|wind/.test(p)) return 'street'
  const opts: MockEffect[] = ['rain', 'door', 'crowd', 'street']
  return opts[Math.floor(seededRandom(p)() * opts.length)] as MockEffect
}

export class MockEngine implements VoiceEngine {
  readonly id = 'mock'
  readonly isMock = true
  readonly capabilities = MOCK_CAPABILITIES
  readonly streamMimeType = 'audio/wav' as const

  async synthesize(req: SynthesisRequest): Promise<AudioResult> {
    if (!req.text.trim()) throw new Error('Text is empty')
    return toResult(renderSpeech(req), MOCK_SAMPLE_RATE)
  }

  async *stream(req: SynthesisRequest): AsyncIterable<Uint8Array> {
    const { audio } = await this.synthesize(req)
    const chunk = 16384
    for (let i = 0; i < audio.length; i += chunk) yield audio.subarray(i, Math.min(audio.length, i + chunk))
  }

  async clone(req: CloneRequest): Promise<EngineVoice> {
    if (!req.samples.length) throw new Error('At least one sample is required')
    return { params: estimateVoiceParams(req.samples, req.kind) }
  }

  async mix(req: MixRequest): Promise<EngineVoice> { return { params: blendVoices(req) } }

  async design(req: DesignRequest): Promise<EngineVoice[]> {
    const count = clamp(Math.floor(req.count ?? 3), 1, 3)
    return Array.from({ length: count }, (_, i) => ({ params: designFromText(req.description, i) }))
  }

  async soundEffect(req: SoundEffectRequest): Promise<AudioResult> {
    const seconds = clamp(req.seconds ?? 4, 0.5, 30)
    return toResult(renderEffect(effectFor(req.prompt), seconds, req.seed ?? req.prompt), MOCK_SAMPLE_RATE)
  }

  async isolate(req: IsolateRequest): Promise<AudioResult> {
    // Spectral stand-in: a high-pass to drop rumble and a soft gate on quiet frames (background noise).
    const { samples, sampleRate } = decodeWav(req.audio)
    const out = new Float32Array(samples.length)
    const a = Math.exp((-2 * Math.PI * 90) / sampleRate)
    let prevX = 0, prevY = 0
    for (let i = 0; i < samples.length; i++) { const x = samples[i] ?? 0; prevY = a * (prevY + x - prevX); prevX = x; out[i] = prevY }
    const frame = Math.floor(sampleRate * 0.02)
    for (let i = 0; i < out.length; i += frame) {
      let e = 0
      for (let k = i; k < Math.min(out.length, i + frame); k++) e = Math.max(e, Math.abs(out[k] ?? 0))
      const g = e < 0.04 ? 0.08 : 1
      for (let k = i; k < Math.min(out.length, i + frame); k++) out[k] = (out[k] ?? 0) * g
    }
    return toResult(out, sampleRate)
  }

  async deleteVoice(): Promise<void> { /* mock voices live only in our database */ }

  async convert(req: ConvertRequest): Promise<AudioResult> {
    const { samples, sampleRate } = decodeWav(req.audio)
    // Keep the source's timing and loudness envelope, re-voice it with the target's pitch and timbre.
    const seconds = samples.length / sampleRate
    const syllables = Math.max(1, Math.round(seconds * req.target.rate))
    const text = Array.from({ length: syllables }, (_, i) => (i % 4 === 3 ? 'ma ' : ['ta', 'lo', 'ne', 'ri'][i % 4])).join('')
    const voiced = renderSpeech({ text, voice: req.target, seed: 'convert' })
    const out = new Float32Array(Math.round(seconds * MOCK_SAMPLE_RATE))
    // Envelope per 10 ms hop (peak over a 40 ms window), so long clips stay linear in time.
    const hop = Math.max(1, Math.floor(sampleRate * 0.01))
    const frames = Math.ceil(samples.length / hop)
    const peak = new Float32Array(frames)
    for (let f = 0; f < frames; f++) {
      let e = 0
      for (let k = f * hop; k < Math.min(samples.length, (f + 1) * hop); k++) e = Math.max(e, Math.abs(samples[k] ?? 0))
      peak[f] = e
    }
    for (let i = 0; i < out.length; i++) {
      const f = Math.floor(((i / MOCK_SAMPLE_RATE) * sampleRate) / hop)
      const e = Math.max(peak[f - 2] ?? 0, peak[f - 1] ?? 0, peak[f] ?? 0, peak[f + 1] ?? 0)
      out[i] = (voiced[i % voiced.length] ?? 0) * Math.min(1, e * 3)
    }
    return toResult(out, MOCK_SAMPLE_RATE)
  }

  async transcribe(req: TranscribeRequest): Promise<Transcript> {
    const { samples, sampleRate } = decodeWav(req.audio)
    const frame = Math.floor(sampleRate * 0.03)
    const speakers = clamp(Math.floor(req.speakers ?? 1), 1, 8)
    const segments: Transcript['segments'] = []
    let start = -1; let quiet = 0
    for (let i = 0; i < samples.length; i += frame) {
      let e = 0
      for (let k = i; k < Math.min(samples.length, i + frame); k++) e = Math.max(e, Math.abs(samples[k] ?? 0))
      const t = Math.round((i / sampleRate) * 1000)
      if (e > 0.05) { if (start < 0) start = t; quiet = 0 }
      else if (start >= 0 && ++quiet * 30 > 350) {
        segments.push({ startMs: start, endMs: t, speaker: `Speaker ${(segments.length % speakers) + 1}`, text: `Mock transcript segment ${segments.length + 1}.` })
        start = -1; quiet = 0
      }
    }
    const end = Math.round((samples.length / sampleRate) * 1000)
    if (start >= 0) segments.push({ startMs: start, endMs: end, speaker: `Speaker ${(segments.length % speakers) + 1}`, text: `Mock transcript segment ${segments.length + 1}.` })
    return { language: 'en', durationMs: end, segments }
  }
}
