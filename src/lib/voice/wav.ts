/** Minimal 16-bit mono PCM WAV encoder and decoder. */

export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const dataBytes = samples.length * 2
  const buf = new ArrayBuffer(44 + dataBytes)
  const v = new DataView(buf)
  const ascii = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)) }
  ascii(0, 'RIFF'); v.setUint32(4, 36 + dataBytes, true); ascii(8, 'WAVE')
  ascii(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  ascii(36, 'data'); v.setUint32(40, dataBytes, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Uint8Array(buf)
}

export interface DecodedWav { samples: Float32Array; sampleRate: number }

/** Decodes 16-bit PCM WAV (mono, or the first channel of stereo). Throws on anything else. */
export function decodeWav(bytes: Uint8Array): DecodedWav {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tag = (off: number) => String.fromCharCode(v.getUint8(off), v.getUint8(off + 1), v.getUint8(off + 2), v.getUint8(off + 3))
  if (bytes.byteLength < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Not a WAV file')
  let off = 12; let sampleRate = 0; let channels = 1; let bits = 16
  while (off + 8 <= bytes.byteLength) {
    const id = tag(off); const size = v.getUint32(off + 4, true); const body = off + 8
    if (id === 'fmt ') {
      if (v.getUint16(body, true) !== 1) throw new Error('Only PCM WAV is supported')
      channels = v.getUint16(body + 2, true); sampleRate = v.getUint32(body + 4, true); bits = v.getUint16(body + 14, true)
    } else if (id === 'data') {
      if (bits !== 16) throw new Error('Only 16-bit WAV is supported')
      const frames = Math.floor(Math.min(size, bytes.byteLength - body) / (2 * channels))
      const out = new Float32Array(frames)
      for (let i = 0; i < frames; i++) out[i] = v.getInt16(body + i * 2 * channels, true) / 0x8000
      return { samples: out, sampleRate }
    }
    off = body + size + (size % 2)
  }
  throw new Error('WAV has no data chunk')
}

/** Loudness per bar, normalised to the loudest bar. */
export function computePeaks(samples: Float32Array, bars = 96): number[] {
  const per = Math.max(1, Math.floor(samples.length / bars))
  const out: number[] = []
  for (let b = 0; b < bars; b++) {
    let sum = 0
    const start = b * per
    for (let i = start; i < Math.min(samples.length, start + per); i++) { const s = samples[i] ?? 0; sum += s * s }
    out.push(Math.sqrt(sum / per))
  }
  const max = Math.max(...out, 1e-6)
  return out.map((p) => Math.round((p / max) * 1000) / 1000)
}
