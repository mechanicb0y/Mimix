import { DEMO_VOICE_IDS, findVoice } from '@/config/voices'
import { fmt, getMessages } from '@/i18n'
import type { MixerLabels } from './MixerPlayground'
import type { HeroDemoLabels } from './HeroDemo'

export function mixerLabels(): MixerLabels {
  const m = getMessages()
  const p = m.mixer.playground
  return { ...p, stop: m.home.demo.stop, valueText: m.home.mixer.teaser.valueText }
}

export function heroDemoProps(): { labels: HeroDemoLabels; voices: Array<{ id: string; name: string; traits: string }> } {
  const m = getMessages()
  const d = m.home.demo
  const voices = DEMO_VOICE_IDS.map((id) => {
    const v = findVoice(id)!
    return { id, name: v.name, traits: fmt(d.voiceTraits, { accent: m.library.values.accent[v.accent as keyof typeof m.library.values.accent], age: m.library.values.age[v.age] }) }
  })
  const { voiceTraits: _t, ...labels } = d
  void _t
  return { labels, voices }
}

/** Shown under demos while the mock engine is active, so nobody mistakes it for final quality. */
export function engineNote(): string | undefined {
  return (process.env.VOICE_ENGINE || 'mock') === 'mock' ? getMessages().common.previewEngine : undefined
}
