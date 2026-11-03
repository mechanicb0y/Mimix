import 'server-only'
import { LIBRARY_VOICES } from '@/config/voices'
import { MIXER_VOICES } from '@/config/mixer-voices'
import { voiceRecipe } from '@/lib/voice/kokoro-engine'
import type { VoiceParams } from '@/lib/voice/types'
import { mixerNeedsRecipes } from '@/server/engine'

export interface DemoMixVoice { id: string; name: string; params: VoiceParams; recipe: string | null }

/**
 * Voices the public Mixer playground offers: Kokoro's library voices when the Kokoro mixer is on
 * (MIXER_ENGINE=kokoro), otherwise the remixable preview voices.
 */
export function demoMixVoices(): DemoMixVoice[] {
  if (mixerNeedsRecipes()) return MIXER_VOICES.filter((v) => (v.language ?? 'en') === 'en').map((v) => ({ id: v.id, name: v.name, params: v.params, recipe: voiceRecipe(v.kokoro) }))
  return LIBRARY_VOICES.filter((v) => v.licence === 'remix').map((v) => ({ id: v.id, name: v.name, params: v.params, recipe: null }))
}

/** Default picks for the playground: the first voices of each gender, so the blend is audible. */
export function demoMixDefaults(): string[] {
  return mixerNeedsRecipes() ? ['hollis', 'miles', 'gideon'] : ['wren', 'atlas', 'juniper']
}
