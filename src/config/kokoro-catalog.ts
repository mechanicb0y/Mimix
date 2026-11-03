import { LIBRARY_VOICES, type Age, type Gender } from '@/config/voices'
import { KOKORO_LIBRARY } from '@/config/kokoro-voices'
import { KOKORO_MEASURES, MIXER_VOICES } from '@/config/mixer-voices'

/** One Kokoro voice with what Voice Design needs to choose it: language, accent, gender, age and measures. */
export interface KokoroCatalogVoice {
  kokoro: string
  language: string
  accent: string
  gender: Gender
  age: Age
  /** Median pitch in Hz and median spectral centroid in Hz (brightness), from KOKORO_MEASURES. */
  f0: number
  centroid: number
}

/** All 54 Kokoro voices, labelled as the Voice Library labels them. */
export function kokoroCatalog(): KokoroCatalogVoice[] {
  const out: KokoroCatalogVoice[] = []
  for (const v of MIXER_VOICES) out.push({ kokoro: v.kokoro, language: v.language ?? 'en', accent: v.accent, gender: v.gender, age: v.age, ...KOKORO_MEASURES[v.kokoro]! })
  for (const [lib, k] of Object.entries(KOKORO_LIBRARY)) {
    const v = LIBRARY_VOICES.find((x) => x.id === lib)!
    // Library voices keep Kokoro's own accent (Kokoro has American and British English only).
    const accent = v.language !== 'en' ? v.accent : k.startsWith('b') ? 'british' : 'american'
    out.push({ kokoro: k, language: v.language, accent, gender: v.gender === 'neutral' ? (k[1] === 'm' ? 'male' : 'female') : v.gender, age: v.age, ...KOKORO_MEASURES[k]! })
  }
  return out
}
