import 'server-only'
import type { ProductKey } from '@/config/nav'
import { engineFeatures } from '@/server/engine'
import { fmt, getMessages } from '@/i18n'

/**
 * Which products the public site may present as available. Reads the same flags as the app
 * (engineFeatures), so a page never promises a tool the app hides. Marketing pages are built
 * statically, so the flags come from the build's environment (VOICE_ENGINE and friends).
 */
export function productAvailability(): Record<ProductKey, boolean> {
  const f = engineFeatures()
  return {
    'text-to-speech': true, studio: true, 'voice-library': true,
    'voice-mixer': f.mixer, 'voice-cloning': f.clone, 'voice-design': f.design, 'voice-changer': f.changer,
    'speech-to-text': f.stt, dubbing: f.dubbing, 'sound-effects': f.sfx, 'voice-isolator': f.isolator,
  }
}

export function isAvailable(key: ProductKey): boolean {
  return productAvailability()[key]
}

/** "Voice Mixer (coming soon)" for lists and tables where a badge doesn't fit. */
export function soonLabel(label: string, available: boolean): string {
  return available ? label : fmt(getMessages().common.soon.suffix, { label })
}

/** The site-wide description: the Mixer line only while the Mixer is on. */
export function siteDescription(): string {
  const m = getMessages().common.meta
  return isAvailable('voice-mixer') ? m.defaultDescription : m.defaultDescriptionNoMixer
}
