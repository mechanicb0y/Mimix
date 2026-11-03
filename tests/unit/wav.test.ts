import { describe, expect, it } from 'vitest'
import { computePeaks, decodeWav, encodeWav } from '@/lib/voice/wav'

describe('encodeWav', () => {
  it('writes a valid 16-bit mono PCM header', () => {
    const bytes = encodeWav(new Float32Array(100), 22050)
    const v = new DataView(bytes.buffer)
    const tag = (o: number) => String.fromCharCode(...bytes.slice(o, o + 4))
    expect(bytes.byteLength).toBe(44 + 200)
    expect(tag(0)).toBe('RIFF')
    expect(v.getUint32(4, true)).toBe(36 + 200)
    expect(tag(8)).toBe('WAVE')
    expect(v.getUint16(20, true)).toBe(1) // PCM
    expect(v.getUint16(22, true)).toBe(1) // mono
    expect(v.getUint32(24, true)).toBe(22050)
    expect(v.getUint32(28, true)).toBe(44100) // byte rate
    expect(v.getUint16(34, true)).toBe(16)
    expect(tag(36)).toBe('data')
    expect(v.getUint32(40, true)).toBe(200)
  })

  it('clamps samples outside -1..1', () => {
    const v = new DataView(encodeWav(Float32Array.from([2, -2]), 8000).buffer)
    expect(v.getInt16(44, true)).toBe(32767)
    expect(v.getInt16(46, true)).toBe(-32768)
  })
})

describe('decodeWav', () => {
  it('round-trips within 16-bit precision', () => {
    const src = Float32Array.from({ length: 64 }, (_, i) => Math.sin(i / 4) * 0.8)
    const out = decodeWav(encodeWav(src, 16000))
    expect(out.sampleRate).toBe(16000)
    expect(out.samples.length).toBe(64)
    for (let i = 0; i < 64; i++) expect(Math.abs((out.samples[i] ?? 0) - (src[i] ?? 0))).toBeLessThan(1 / 16000)
  })

  it('rejects files that are not WAV', () => {
    expect(() => decodeWav(new Uint8Array(60))).toThrow('Not a WAV file')
  })
})

describe('computePeaks', () => {
  it('returns the requested bar count, normalised to 1', () => {
    const s = Float32Array.from({ length: 960 }, (_, i) => (i < 480 ? 0.1 : 0.5))
    const peaks = computePeaks(s, 96)
    expect(peaks).toHaveLength(96)
    expect(Math.max(...peaks)).toBe(1)
    expect(peaks[0]).toBeCloseTo(0.2, 2)
  })

  it('handles silence without dividing by zero', () => {
    expect(computePeaks(new Float32Array(100), 10).every((p) => p === 0)).toBe(true)
  })
})
