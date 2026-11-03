import { describe, expect, it } from 'vitest'
import { blendVoices, designFromText, estimatePitch, MOCK_SAMPLE_RATE, renderSpeech } from '@/lib/voice/mock-engine'
import { LIBRARY_VOICES } from '@/config/voices'
import type { VoiceParams } from '@/lib/voice/types'

const voice = (id: string): VoiceParams => {
  const v = LIBRARY_VOICES.find((x) => x.id === id)
  if (!v) throw new Error(`missing voice ${id}`)
  return v.params
}

describe('renderSpeech', () => {
  it('is deterministic for the same input', () => {
    const a = renderSpeech({ text: 'Hello there', voice: voice('wren') })
    const b = renderSpeech({ text: 'Hello there', voice: voice('wren') })
    expect(a.length).toBeGreaterThan(MOCK_SAMPLE_RATE * 0.3)
    expect(a).toEqual(b)
  })

  it('stays inside full scale', () => {
    const s = renderSpeech({ text: 'Loud and proud, with some style!', voice: voice('atlas'), settings: { style: 1 } })
    let max = 0
    for (const x of s) max = Math.max(max, Math.abs(x))
    expect(max).toBeLessThanOrEqual(1)
    expect(max).toBeGreaterThan(0.05)
  })

  it('speaks at roughly the voice pitch', () => {
    const v = voice('atlas')
    const f0 = estimatePitch(renderSpeech({ text: 'A long open vowel sound, aaah, ooh.', voice: v, settings: { stability: 1 } }), MOCK_SAMPLE_RATE)
    expect(f0).toBeGreaterThan(v.f0 * 0.7)
    expect(f0).toBeLessThan(v.f0 * 1.3)
  })
})

describe('blendVoices', () => {
  const a = voice('wren')
  const b = voice('atlas')

  it('returns the source when it has all the weight', () => {
    const m = blendVoices({ sources: [{ voice: a, weight: 1 }, { voice: b, weight: 0 }] })
    expect(m.f0).toBeCloseTo(a.f0, 0)
    expect(m.formantShift).toBeCloseTo(a.formantShift, 2)
  })

  it('lands between the sources at 50/50', () => {
    const m = blendVoices({ sources: [{ voice: a, weight: 0.5 }, { voice: b, weight: 0.5 }] })
    expect(m.f0).toBeGreaterThan(Math.min(a.f0, b.f0))
    expect(m.f0).toBeLessThan(Math.max(a.f0, b.f0))
  })

  it('normalises weights', () => {
    const x = blendVoices({ sources: [{ voice: a, weight: 2 }, { voice: b, weight: 2 }] })
    const y = blendVoices({ sources: [{ voice: a, weight: 0.5 }, { voice: b, weight: 0.5 }] })
    expect(x).toEqual(y)
  })

  it('raises pitch when adjusted up', () => {
    const base = blendVoices({ sources: [{ voice: a, weight: 1 }, { voice: b, weight: 1 }] })
    const up = blendVoices({ sources: [{ voice: a, weight: 1 }, { voice: b, weight: 1 }], adjust: { pitch: 1 } })
    expect(up.f0).toBeGreaterThan(base.f0)
  })

  it('refuses a mix without two weighted sources', () => {
    expect(() => blendVoices({ sources: [{ voice: a, weight: 1 }] })).toThrow()
    expect(() => blendVoices({ sources: [{ voice: a, weight: 0 }, { voice: b, weight: 0 }] })).toThrow()
  })
})

describe('designFromText', () => {
  it('makes deep descriptions lower than bright ones', () => {
    expect(designFromText('deep older male narrator').f0).toBeLessThan(designFromText('bright young female voice').f0)
  })
  it('gives different variants for the same description', () => {
    expect(designFromText('warm narrator', 0)).not.toEqual(designFromText('warm narrator', 1))
  })
})
