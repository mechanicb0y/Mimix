/** Product catalogue: structure only. Every user-facing word lives in src/i18n/messages. */
export const PRODUCT_SLUGS = [
  'text-to-speech', 'voice-cloning', 'voice-design', 'voice-changer', 'speech-to-text',
  'dubbing', 'sound-effects', 'voice-isolator', 'studio',
] as const
export type ProductSlug = (typeof PRODUCT_SLUGS)[number]

export type IconName =
  | 'AudioLines' | 'Blend' | 'Copy' | 'Wand' | 'Repeat' | 'FileText' | 'Languages' | 'Sparkles'
  | 'Eraser' | 'BookOpen' | 'Library' | 'Code' | 'Users' | 'Mic' | 'GraduationCap' | 'Gamepad'
  | 'Building' | 'Newspaper' | 'LifeBuoy' | 'Info' | 'Mail' | 'Zap' | 'Webhook' | 'KeyRound' | 'Shield'

export interface ProductDef {
  slug: ProductSlug
  icon: IconName
  /** Sample clips rendered by the voice engine at build time (see app/audio/samples). */
  samples: string[]
  /** Related products shown at the bottom of the page. */
  related: Array<ProductSlug | 'voice-mixer'>
}

export const PRODUCTS: Record<ProductSlug, ProductDef> = {
  'text-to-speech': { slug: 'text-to-speech', icon: 'AudioLines', samples: ['tts-narration', 'tts-ad', 'tts-character'], related: ['voice-mixer', 'studio', 'voice-cloning'] },
  'voice-cloning': { slug: 'voice-cloning', icon: 'Copy', samples: ['clone-original', 'clone-result'], related: ['voice-mixer', 'text-to-speech', 'voice-changer'] },
  'voice-design': { slug: 'voice-design', icon: 'Wand', samples: ['design-narrator', 'design-guide', 'design-villain'], related: ['voice-mixer', 'text-to-speech', 'voice-cloning'] },
  'voice-changer': { slug: 'voice-changer', icon: 'Repeat', samples: ['changer-before', 'changer-after'], related: ['voice-cloning', 'voice-isolator', 'dubbing'] },
  'speech-to-text': { slug: 'speech-to-text', icon: 'FileText', samples: ['stt-interview'], related: ['dubbing', 'voice-isolator', 'studio'] },
  dubbing: { slug: 'dubbing', icon: 'Languages', samples: ['dub-original', 'dub-spanish'], related: ['speech-to-text', 'voice-cloning', 'studio'] },
  'sound-effects': { slug: 'sound-effects', icon: 'Sparkles', samples: ['sfx-rain', 'sfx-door', 'sfx-crowd'], related: ['text-to-speech', 'studio', 'voice-design'] },
  'voice-isolator': { slug: 'voice-isolator', icon: 'Eraser', samples: ['isolator-before', 'isolator-after'], related: ['speech-to-text', 'voice-changer', 'dubbing'] },
  studio: { slug: 'studio', icon: 'BookOpen', samples: ['studio-chapter'], related: ['text-to-speech', 'voice-mixer', 'dubbing'] },
}

export const USE_CASE_SLUGS = ['creators', 'podcasts', 'education', 'games', 'business'] as const
export type UseCaseSlug = (typeof USE_CASE_SLUGS)[number]
export const USE_CASES: Record<UseCaseSlug, { icon: IconName; products: Array<ProductSlug | 'voice-mixer'>; sample: string }> = {
  creators: { icon: 'Sparkles', products: ['text-to-speech', 'voice-mixer', 'voice-changer', 'sound-effects'], sample: 'tts-ad' },
  podcasts: { icon: 'Mic', products: ['studio', 'voice-isolator', 'speech-to-text', 'dubbing'], sample: 'studio-chapter' },
  education: { icon: 'GraduationCap', products: ['text-to-speech', 'dubbing', 'studio', 'speech-to-text'], sample: 'tts-narration' },
  games: { icon: 'Gamepad', products: ['voice-design', 'voice-mixer', 'sound-effects', 'text-to-speech'], sample: 'design-villain' },
  business: { icon: 'Building', products: ['dubbing', 'text-to-speech', 'voice-cloning', 'speech-to-text'], sample: 'tts-narration' },
}

export const LEGAL_SLUGS = ['terms', 'privacy', 'acceptable-use', 'voice-cloning-policy'] as const
export type LegalSlug = (typeof LEGAL_SLUGS)[number]
