import { describe, expect, it } from 'vitest'
import { designRecipes, traitsFromText } from '@/lib/voice/kokoro-design'
import { parseRecipe } from '@/lib/voice/kokoro-engine'
import { kokoroCatalog } from '@/config/kokoro-catalog'

const catalog = kokoroCatalog()
const by = (k: string) => catalog.find((v) => v.kokoro === k)!

describe('Voice Design on Kokoro', () => {
  it('knows all 54 Kokoro voices with their measures', () => {
    expect(new Set(catalog.map((v) => v.kokoro)).size).toBe(54)
    expect(catalog.every((v) => v.f0 > 50 && v.centroid > 300)).toBe(true)
  })

  it('reads traits from a description', () => {
    expect(traitsFromText('A warm older narrator with a soft Scottish accent, unhurried and kind. He reads slowly.')).toMatchObject({ gender: 'male', age: 'older', accent: 'british', pace: 'slow', warmth: 'warm' })
    expect(traitsFromText('Bright, energetic young woman for adverts')).toMatchObject({ gender: 'female', age: 'young', pace: 'fast', warmth: 'bright' })
  })

  it('makes three on-brief recipes: the right language, gender and accent', () => {
    const out = designRecipes(catalog, { gender: 'male', accent: 'british', pitch: 'low', pace: 'slow', warmth: 'warm' }, { language: 'en', seed: 'a' })
    expect(out).toHaveLength(3)
    for (const o of out) {
      const r = parseRecipe(o.recipe)!
      for (const k of Object.keys(r.weights)) { expect(by(k).gender).toBe('male'); expect(k.startsWith('b')).toBe(true) }
      expect(r.speed).toBeLessThan(1)
      expect(r.warmth).toBeGreaterThan(0)
    }
    // Different options, not the same recipe three times.
    expect(new Set(out.map((o) => o.recipe)).size).toBe(3)
  })

  it('sets pitch so that low sounds lower than high', () => {
    const pitchOf = (p: 'low' | 'high') => {
      const o = designRecipes(catalog, { gender: 'female', pitch: p }, { language: 'en', seed: 's' })[0]!
      const r = parseRecipe(o.recipe)!
      const f0 = Object.entries(r.weights).reduce((s, [k, w]) => s + by(k).f0 * w, 0)
      return f0 * 2 ** ((r.pitch * 2) / 12)
    }
    expect(pitchOf('low')).toBeLessThan(pitchOf('high') * 0.85)
  })

  it('designs Mandarin and Japanese voices from those languages, and refuses a language Kokoro lacks', () => {
    for (const [lang, prefix] of [['zh', 'z'], ['ja', 'j']] as const) {
      for (const o of designRecipes(catalog, { gender: 'female' }, { language: lang })) {
        expect(Object.keys(parseRecipe(o.recipe)!.weights).every((k) => k.startsWith(prefix))).toBe(true)
      }
    }
    expect(() => designRecipes(catalog, {}, { language: 'de' })).toThrow(RangeError)
  })

  it('varies the options when asked again', () => {
    const sets = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((seed) => designRecipes(catalog, { gender: 'female' }, { language: 'en', seed })[0]!.recipe))
    expect(sets.size).toBeGreaterThan(1)
  })
})
