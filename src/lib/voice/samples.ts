/**
 * Every sample clip on the marketing site, rendered by the voice engine at build time.
 * The text comes from the locale messages so clips can be re-rendered per language.
 */
import { LIBRARY_VOICES, findVoice } from '@/config/voices'
import { PRODUCTS, USE_CASES, USE_CASE_SLUGS, PRODUCT_SLUGS } from '@/config/products'
import { getMessages } from '@/i18n'
import { designFromText, MOCK_SAMPLE_RATE, renderSpeech } from './mock-engine'
import { renderEffect, type MockEffect } from './mock-sfx'
import type { VoiceParams } from './types'
import { computePeaks, encodeWav } from './wav'

type Part = { voice: VoiceParams; text: string }
type SampleSpec =
  | { kind: 'speech'; parts: Part[]; noise?: MockEffect }
  | { kind: 'effect'; effect: MockEffect; seconds: number }

const v = (id: string): VoiceParams => {
  const voice = findVoice(id)
  if (!voice) throw new Error(`Unknown voice ${id}`)
  return voice.params
}

/** Splits text into sentences and gives them to the voices in turn (interviews, dialogue). */
function alternate(text: string, voices: VoiceParams[]): Part[] {
  const sentences = text.match(/[^.?!]+[.?!]+/g) ?? [text]
  return sentences.map((s, i) => ({ voice: voices[i % voices.length] as VoiceParams, text: s.trim() }))
}

export function sampleRegistry(): Record<string, SampleSpec> {
  const m = getMessages('en')
  const p = m.products
  const reg: Record<string, SampleSpec> = {}
  const speech = (id: string, voice: VoiceParams, text: string, noise?: MockEffect) => { reg[id] = { kind: 'speech', parts: [{ voice, text }], noise } }

  speech('tts-narration', v('marlow'), p['text-to-speech'].samples.items['tts-narration'].text)
  speech('tts-ad', v('atlas'), p['text-to-speech'].samples.items['tts-ad'].text)
  speech('tts-character', v('tamsin'), p['text-to-speech'].samples.items['tts-character'].text)
  speech('clone-original', v('juniper'), p['voice-cloning'].samples.items['clone-original'].text, 'street')
  speech('clone-result', v('juniper'), p['voice-cloning'].samples.items['clone-result'].text)
  speech('design-narrator', designFromText('calm documentary narrator deep unhurried'), p['voice-design'].samples.items['design-narrator'].text)
  speech('design-guide', designFromText('cheerful young tour guide quick bright woman'), p['voice-design'].samples.items['design-guide'].text)
  speech('design-villain', designFromText('breathy villain low theatrical man'), p['voice-design'].samples.items['design-villain'].text)
  speech('changer-before', v('koa'), p['voice-changer'].samples.items['changer-before'].text)
  speech('changer-after', v('juniper'), p['voice-changer'].samples.items['changer-after'].text)
  reg['stt-interview'] = { kind: 'speech', parts: alternate(p['speech-to-text'].samples.items['stt-interview'].text, [v('atlas'), v('wren')]) }
  speech('dub-original', v('sable'), p.dubbing.samples.items['dub-original'].text)
  speech('dub-spanish', v('sable'), p.dubbing.samples.items['dub-spanish'].text)
  reg['sfx-rain'] = { kind: 'effect', effect: 'rain', seconds: 6 }
  reg['sfx-door'] = { kind: 'effect', effect: 'door', seconds: 2 }
  reg['sfx-crowd'] = { kind: 'effect', effect: 'crowd', seconds: 6 }
  speech('isolator-before', v('indigo'), p['voice-isolator'].samples.items['isolator-before'].text, 'street')
  speech('isolator-after', v('indigo'), p['voice-isolator'].samples.items['isolator-after'].text)
  reg['studio-chapter'] = { kind: 'speech', parts: [
    { voice: v('marlow'), text: 'Chapter three.' },
    { voice: v('wren'), text: '“Are you sure about this?”' },
    { voice: v('marlow'), text: 'asked Wren.' },
    { voice: v('atlas'), text: '“Not at all,”' },
    { voice: v('marlow'), text: 'said Atlas, and opened the gate.' },
  ] }
  for (const item of m.home.samples.items) speech(`home-${item.voice}`, v(item.voice), item.text)
  const useCaseVoice: Record<string, string> = { creators: 'juniper', podcasts: 'atlas', education: 'sable', games: 'koa', business: 'wren' }
  for (const slug of USE_CASE_SLUGS) speech(`usecase-${slug}`, v(useCaseVoice[slug] as string), m.useCases[slug].sampleText)
  for (const voice of LIBRARY_VOICES) speech(`voice-${voice.id}`, voice.params, m.library.sampleText)

  // Guard: every sample a page refers to must exist.
  for (const slug of PRODUCT_SLUGS) for (const id of PRODUCTS[slug].samples) if (!reg[id]) throw new Error(`Missing sample ${id}`)
  void USE_CASES
  return reg
}

export const SAMPLE_IDS = Object.keys(sampleRegistry())

export interface RenderedSample { wav: Uint8Array; durationMs: number; peaks: number[] }
const cache = new Map<string, RenderedSample>()
let registry: Record<string, SampleSpec> | undefined

export function renderSample(id: string): RenderedSample | null {
  const hit = cache.get(id)
  if (hit) return hit
  registry ??= sampleRegistry()
  const spec = registry[id]
  if (!spec) return null
  const fs = MOCK_SAMPLE_RATE
  let samples: Float32Array
  if (spec.kind === 'effect') {
    samples = renderEffect(spec.effect, spec.seconds, id)
  } else {
    const parts = spec.parts.map((part, i) => renderSpeech({ text: part.text, voice: part.voice, seed: `${id}-${i}` }))
    const gap = Math.floor(fs * 0.12)
    samples = new Float32Array(parts.reduce((t, s) => t + s.length + gap, 0))
    let at = 0
    for (const s of parts) { samples.set(s, at); at += s.length + gap }
    if (spec.noise) {
      const noise = renderEffect(spec.noise, samples.length / fs + 0.1, `${id}-noise`)
      for (let i = 0; i < samples.length; i++) samples[i] = (samples[i] ?? 0) * 0.75 + (noise[i] ?? 0) * 0.45
    }
  }
  const result = { wav: encodeWav(samples, fs), durationMs: Math.round((samples.length / fs) * 1000), peaks: computePeaks(samples, 64) }
  cache.set(id, result)
  return result
}

/** What a page needs to draw a player before the audio loads. */
export function sampleMeta(id: string): { src: string; durationMs: number; peaks: number[] } {
  const r = renderSample(id)
  if (!r) throw new Error(`Unknown sample ${id}`)
  return { src: `/audio/samples/${id}`, durationMs: r.durationMs, peaks: r.peaks }
}
