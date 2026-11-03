/** Procedural sound effects for the mock engine: rain, knocks and a café crowd. */
import { MOCK_SAMPLE_RATE, renderSpeech, seededRandom } from './mock-engine'
import type { VoiceParams } from './types'

export type MockEffect = 'rain' | 'door' | 'crowd' | 'street'

export function renderEffect(effect: MockEffect, seconds: number, seed: string = effect, fs = MOCK_SAMPLE_RATE): Float32Array {
  const n = Math.floor(seconds * fs)
  const out = new Float32Array(n)
  const rand = seededRandom(seed)
  if (effect === 'rain' || effect === 'street') {
    // Pink-ish noise bed plus droplets (rain) or passing rumble (street).
    let b0 = 0, b1 = 0, b2 = 0
    for (let i = 0; i < n; i++) {
      const w = rand() * 2 - 1
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526
      const pink = (b0 + b1 + b2 + w * 0.1848) * 0.12
      const swell = effect === 'street' ? 0.6 + 0.4 * Math.sin((2 * Math.PI * i) / (fs * 3.7)) : 1
      out[i] = pink * swell
    }
    if (effect === 'rain') {
      const drops = Math.floor(seconds * 38)
      for (let d = 0; d < drops; d++) {
        const at = Math.floor(rand() * (n - fs * 0.03)); const freq = 2500 + rand() * 3500; const amp = 0.15 + rand() * 0.35
        for (let k = 0; k < fs * 0.025; k++) out[at + k] = (out[at + k] ?? 0) + Math.sin((2 * Math.PI * freq * k) / fs) * amp * Math.exp(-k / (fs * 0.004))
      }
    } else {
      for (let pass = 0; pass < 2; pass++) {
        const start = Math.floor((0.5 + pass * 2.2) * fs); const len = Math.floor(1.8 * fs); let lp = 0
        for (let k = 0; k < len && start + k < n; k++) {
          lp += 0.02 * ((rand() * 2 - 1) - lp)
          out[start + k] = (out[start + k] ?? 0) + lp * 3.5 * Math.sin((Math.PI * k) / len)
        }
      }
    }
  } else if (effect === 'door') {
    for (let hit = 0; hit < 3; hit++) {
      const at = Math.floor((0.35 + hit * 0.42) * fs)
      for (let k = 0; k < fs * 0.35 && at + k < n; k++) {
        const env = Math.exp(-k / (fs * 0.045))
        const body = Math.sin((2 * Math.PI * 95 * k) / fs) * 0.9 + Math.sin((2 * Math.PI * 180 * k) / fs) * 0.45 + Math.sin((2 * Math.PI * 410 * k) / fs) * 0.2
        const click = k < fs * 0.004 ? (rand() * 2 - 1) * 0.8 : 0
        out[at + k] = (out[at + k] ?? 0) + (body + click) * env
      }
    }
  } else {
    // Crowd: several quiet speakers talking over each other, plus cup clinks.
    const talkers: VoiceParams[] = [
      { f0: 120, formantShift: 0.95, rate: 4.8, breathiness: 0.15, brightness: 0.4, expressiveness: 0.7 },
      { f0: 205, formantShift: 1.12, rate: 5, breathiness: 0.12, brightness: 0.5, expressiveness: 0.7 },
      { f0: 160, formantShift: 1.05, rate: 4.4, breathiness: 0.2, brightness: 0.4, expressiveness: 0.6 },
      { f0: 105, formantShift: 0.92, rate: 4.2, breathiness: 0.1, brightness: 0.35, expressiveness: 0.6 },
    ]
    const lines = ['so then we went down to the market and it was packed', 'honestly the coffee here is better than it used to be', 'did you see the game last night, unbelievable finish', 'I told her we should leave earlier but nobody listens']
    talkers.forEach((voice, t) => {
      const speech = renderSpeech({ text: `${lines[t]} ${lines[(t + 1) % 4]}`, voice, seed: `crowd${t}` })
      const offset = Math.floor(rand() * fs * 0.8)
      for (let i = 0; i < speech.length && i + offset < n; i++) out[i + offset] = (out[i + offset] ?? 0) + (speech[i] ?? 0) * 0.22
    })
    for (let c = 0; c < 4; c++) {
      const at = Math.floor(rand() * (n - fs * 0.2)); const f = 3000 + rand() * 1500
      for (let k = 0; k < fs * 0.15; k++) out[at + k] = (out[at + k] ?? 0) + Math.sin((2 * Math.PI * f * k) / fs) * 0.25 * Math.exp(-k / (fs * 0.03))
    }
  }
  let peak = 1e-6
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i] ?? 0))
  const fadeN = Math.floor(fs * 0.05)
  for (let i = 0; i < n; i++) {
    const fade = Math.min(1, i / fadeN, (n - 1 - i) / fadeN)
    out[i] = ((out[i] ?? 0) / peak) * 0.7 * fade
  }
  return out
}
