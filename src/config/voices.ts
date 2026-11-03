import type { VoiceParams } from '@/lib/voice/types'

/**
 * Library preview voices. Names, traits and acoustic settings are original to Mimix.
 * The live library (Phase 4) reads from the database; this list seeds the marketing preview.
 */
export type Gender = 'female' | 'male' | 'neutral'
export type Age = 'young' | 'middle' | 'older'
export type UseCase = 'narration' | 'conversational' | 'characters' | 'advertising' | 'education' | 'news'
export type Licence = 'remix' | 'standard'

export interface LibraryVoice {
  id: string
  name: string
  language: 'en' | 'es' | 'fr' | 'de' | 'hi' | 'ms' | 'ar' | 'ja'
  accent: string
  gender: Gender
  age: Age
  useCase: UseCase
  licence: Licence
  params: VoiceParams
}

export const LIBRARY_VOICES: LibraryVoice[] = [
  { id: 'wren', name: 'Wren', language: 'en', accent: 'british', gender: 'female', age: 'young', useCase: 'narration', licence: 'remix', params: { f0: 205, formantShift: 1.14, rate: 4.4, breathiness: 0.18, brightness: 0.62, expressiveness: 0.6 } },
  { id: 'atlas', name: 'Atlas', language: 'en', accent: 'american', gender: 'male', age: 'middle', useCase: 'advertising', licence: 'remix', params: { f0: 108, formantShift: 0.92, rate: 4.6, breathiness: 0.08, brightness: 0.45, expressiveness: 0.7 } },
  { id: 'juniper', name: 'Juniper', language: 'en', accent: 'australian', gender: 'female', age: 'middle', useCase: 'conversational', licence: 'remix', params: { f0: 192, formantShift: 1.1, rate: 4.9, breathiness: 0.12, brightness: 0.58, expressiveness: 0.75 } },
  { id: 'koa', name: 'Koa', language: 'en', accent: 'american', gender: 'neutral', age: 'young', useCase: 'characters', licence: 'remix', params: { f0: 160, formantShift: 1.04, rate: 5.2, breathiness: 0.1, brightness: 0.66, expressiveness: 0.9 } },
  { id: 'marlow', name: 'Marlow', language: 'en', accent: 'scottish', gender: 'male', age: 'older', useCase: 'narration', licence: 'standard', params: { f0: 98, formantShift: 0.9, rate: 3.7, breathiness: 0.2, brightness: 0.35, expressiveness: 0.5 } },
  { id: 'sable', name: 'Sable', language: 'en', accent: 'american', gender: 'female', age: 'older', useCase: 'education', licence: 'remix', params: { f0: 178, formantShift: 1.06, rate: 4.0, breathiness: 0.16, brightness: 0.42, expressiveness: 0.45 } },
  { id: 'indigo', name: 'Indigo', language: 'en', accent: 'indian', gender: 'male', age: 'young', useCase: 'news', licence: 'remix', params: { f0: 128, formantShift: 0.97, rate: 4.8, breathiness: 0.07, brightness: 0.56, expressiveness: 0.55 } },
  { id: 'noor', name: 'Noor', language: 'ar', accent: 'gulf', gender: 'female', age: 'middle', useCase: 'conversational', licence: 'standard', params: { f0: 198, formantShift: 1.12, rate: 4.5, breathiness: 0.14, brightness: 0.5, expressiveness: 0.65 } },
  { id: 'elio', name: 'Elio', language: 'es', accent: 'castilian', gender: 'male', age: 'middle', useCase: 'advertising', licence: 'remix', params: { f0: 118, formantShift: 0.95, rate: 5.0, breathiness: 0.09, brightness: 0.52, expressiveness: 0.8 } },
  { id: 'tamsin', name: 'Tamsin', language: 'en', accent: 'irish', gender: 'female', age: 'young', useCase: 'characters', licence: 'remix', params: { f0: 218, formantShift: 1.16, rate: 5.1, breathiness: 0.13, brightness: 0.7, expressiveness: 0.85 } },
  { id: 'bram', name: 'Bram', language: 'de', accent: 'standard', gender: 'male', age: 'older', useCase: 'education', licence: 'standard', params: { f0: 104, formantShift: 0.91, rate: 3.9, breathiness: 0.11, brightness: 0.4, expressiveness: 0.4 } },
  { id: 'aisyah', name: 'Aisyah', language: 'ms', accent: 'malaysian', gender: 'female', age: 'young', useCase: 'education', licence: 'remix', params: { f0: 210, formantShift: 1.13, rate: 4.6, breathiness: 0.12, brightness: 0.6, expressiveness: 0.6 } },
]

export const DEMO_VOICE_IDS = ['wren', 'atlas', 'juniper', 'marlow'] as const

export function findVoice(id: string): LibraryVoice | undefined {
  return LIBRARY_VOICES.find((v) => v.id === id)
}
