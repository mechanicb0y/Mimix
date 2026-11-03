/**
 * Voice Design on Kokoro (CPU): turns a description into three Mixer recipes. Each option starts
 * from the Kokoro voices that best fit the gender, age, accent and language, blends one to three of
 * them, then sets pitch, pace and warmth with the recipe's own adjustments. Nothing is trained, so
 * it is instant and free to run; a designed voice is a recipe like any mix.
 */
import type { KokoroCatalogVoice } from '@/config/kokoro-catalog'
import { formatRecipe, type Recipe } from './kokoro-engine'

export type DesignGender = 'female' | 'male' | 'any'
export type DesignAge = 'young' | 'middle' | 'older' | 'any'
export type DesignPitch = 'low' | 'medium' | 'high'
export type DesignPace = 'slow' | 'normal' | 'fast'
export type DesignWarmth = 'warm' | 'neutral' | 'bright'
export interface VoiceTraits { gender?: DesignGender; age?: DesignAge; accent?: string; pitch?: DesignPitch; pace?: DesignPace; warmth?: DesignWarmth }

/** Kokoro's languages, with the accents it has for each. */
export const KOKORO_DESIGN_LANGUAGES: Record<string, string[]> = {
  en: ['american', 'british'], es: ['castilian'], fr: ['standard'], hi: ['standard'], it: ['standard'], pt: ['brazilian'], ja: ['standard'], zh: ['standard'],
}

/** Words in a free-text description that set a trait the person didn't pick. English only. */
export function traitsFromText(text: string): VoiceTraits {
  const s = ` ${text.toLowerCase().replace(/[^a-z\s-]/g, ' ')} `
  const has = (...w: string[]) => w.some((x) => s.includes(` ${x} `))
  const t: VoiceTraits = {}
  if (has('woman', 'female', 'girl', 'lady', 'she', 'her', 'mother', 'grandmother')) t.gender = 'female'
  else if (has('man', 'male', 'boy', 'guy', 'he', 'his', 'father', 'grandfather', 'gentleman')) t.gender = 'male'
  if (has('old', 'older', 'elderly', 'aged', 'senior', 'grandfather', 'grandmother', 'veteran')) t.age = 'older'
  else if (has('young', 'youthful', 'teen', 'teenage', 'girl', 'boy', 'child', 'kid')) t.age = 'young'
  if (has('british', 'english', 'london', 'scottish', 'irish', 'welsh')) t.accent = 'british'
  else if (has('american', 'us', 'usa', 'australian', 'canadian')) t.accent = 'american'
  if (has('deep', 'low', 'bass', 'baritone', 'gravelly')) t.pitch = 'low'
  else if (has('high', 'high-pitched', 'squeaky', 'bright-voiced', 'light')) t.pitch = 'high'
  if (has('slow', 'slowly', 'unhurried', 'calm', 'measured', 'relaxed')) t.pace = 'slow'
  else if (has('fast', 'quick', 'energetic', 'excited', 'lively', 'brisk')) t.pace = 'fast'
  if (has('warm', 'soft', 'gentle', 'rich', 'smooth', 'kind', 'cosy', 'cozy', 'mellow')) t.warmth = 'warm'
  else if (has('bright', 'crisp', 'clear', 'sharp', 'thin', 'airy')) t.warmth = 'bright'
  return t
}

const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)]! : 0 }
const pct = (xs: number[], p: number) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))]! : 0 }
const semis = (a: number, b: number) => 12 * Math.log2(a / b)
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
function hash(s: string): number { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }

/** Recipe pitch of ±1 moves pitch by this many semitones (engines/kokoro/server.py PITCH_SEMITONES). */
const PITCH_SEMITONES = 2

export interface DesignedRecipe { recipe: string; voices: string[]; traits: Required<Omit<VoiceTraits, 'accent'>> & { accent: string } }

/**
 * Three recipes for a description. Throws a RangeError when Kokoro has no voice in the language.
 * `seed` rotates which close matches lead, so asking again gives different options.
 */
export function designRecipes(catalog: KokoroCatalogVoice[], picked: VoiceTraits, opts: { language?: string; description?: string; seed?: string } = {}): DesignedRecipe[] {
  const language = (opts.language ?? 'en').split('-')[0]!
  if (!KOKORO_DESIGN_LANGUAGES[language]) throw new RangeError(`no_kokoro_language:${language}`)
  const guessed = traitsFromText(opts.description ?? '')
  const t = {
    gender: picked.gender && picked.gender !== 'any' ? picked.gender : guessed.gender ?? 'any',
    age: picked.age && picked.age !== 'any' ? picked.age : guessed.age ?? 'any',
    accent: picked.accent && KOKORO_DESIGN_LANGUAGES[language]!.includes(picked.accent) ? picked.accent : guessed.accent && KOKORO_DESIGN_LANGUAGES[language]!.includes(guessed.accent) ? guessed.accent : 'any',
    pitch: picked.pitch ?? guessed.pitch ?? 'medium',
    pace: picked.pace ?? guessed.pace ?? 'normal',
    warmth: picked.warmth ?? guessed.warmth ?? 'neutral',
  }
  let pool = catalog.filter((v) => v.language === language)
  if (t.gender !== 'any') pool = pool.filter((v) => v.gender === t.gender)
  if (t.accent !== 'any' && pool.some((v) => v.accent === t.accent)) pool = pool.filter((v) => v.accent === t.accent)
  if (!pool.length) pool = catalog.filter((v) => v.language === language)

  // Pitch targets come from the voices of that gender in the whole catalogue, so "low" means low for a woman or a man.
  const pitchOf = (g: 'female' | 'male') => catalog.filter((v) => v.gender === g).map((v) => v.f0)
  const target = (g: 'female' | 'male') => {
    const f = pitchOf(g)
    const base = t.pitch === 'low' ? pct(f, 0.2) : t.pitch === 'high' ? pct(f, 0.8) : median(f)
    return t.age === 'older' ? base * 0.95 : t.age === 'young' ? base * 1.04 : base
  }
  const cents = catalog.map((v) => v.centroid)
  const lowC = pct(cents, 0.25), highC = pct(cents, 0.75)
  const score = (v: KokoroCatalogVoice) => {
    let s = Math.abs(semis(v.f0, target(v.gender as 'female' | 'male')))
    if (t.age !== 'any' && v.age !== t.age) s += v.age === 'middle' ? 1.5 : 4
    if (t.warmth === 'warm') s += Math.max(0, (v.centroid - lowC) / 400)
    if (t.warmth === 'bright') s += Math.max(0, (highC - v.centroid) / 400)
    if (t.accent !== 'any' && v.accent !== t.accent) s += 3
    return s
  }
  const ranked = [...pool].sort((a, b) => score(a) - score(b) || a.kokoro.localeCompare(b.kokoro))
  // Rotate among the closest matches by seed, so "generate again" varies but stays on brief.
  const r = hash(opts.seed ?? '') % Math.min(3, ranked.length)
  const lead = ranked[r]!
  const same = ranked.filter((v) => v.kokoro !== lead.kokoro && v.gender === lead.gender)
  const second = same[0] ?? lead
  const third = same[1] ?? second

  const pace = t.pace === 'slow' ? 0.88 : t.pace === 'fast' ? 1.12 : 1
  const warmth = t.warmth === 'warm' ? 0.5 : t.warmth === 'bright' ? -0.5 : 0
  const build = (weights: Record<string, number>, nudge: { pitch?: number; warmth?: number; speed?: number } = {}): string => {
    const voices = Object.keys(weights)
    const f0 = voices.reduce((sum, k) => sum + (catalog.find((v) => v.kokoro === k)!.f0 * weights[k]!), 0)
    const g = (catalog.find((v) => v.kokoro === voices[0])!.gender) as 'female' | 'male'
    // What the blend still misses on pitch, made up with the recipe's pitch (within ±0.8).
    const pitch = clamp(semis(target(g), f0) / PITCH_SEMITONES + (nudge.pitch ?? 0), -0.8, 0.8)
    const recipe: Recipe = { weights, speed: clamp(pace * (nudge.speed ?? 1), 0.5, 2), pitch, warmth: clamp(warmth + (nudge.warmth ?? 0), -1, 1) }
    return formatRecipe(recipe)
  }
  const options = [
    { weights: { [lead.kokoro]: 1 } },
    { weights: lead.kokoro === second.kokoro ? { [lead.kokoro]: 1 } : { [lead.kokoro]: 0.6, [second.kokoro]: 0.4 }, nudge: { warmth: 0.15 } },
    { weights: second.kokoro === third.kokoro ? { [second.kokoro]: 1 } : { [second.kokoro]: 0.5, [third.kokoro]: 0.5 }, nudge: { warmth: -0.15, speed: 1.03 } },
  ]
  const accent = t.accent !== 'any' ? t.accent : lead.accent
  return options.map((o) => ({ recipe: build(o.weights, o.nudge), voices: Object.keys(o.weights), traits: { ...t, accent } }))
}
