/**
 * Text to Speech request schema, shared by the studio form and the API. Error messages are codes
 * looked up in app.validation, so they are translated with the rest of the copy.
 */
import { z } from '@/lib/zod'
import { ENGINE_LIMITS } from '@/config/engine-limits'

export const TTS_MAX_CHARS = ENGINE_LIMITS.ttsCharsPerTake.value
export const OUTPUT_FORMATS = ['mp3', 'wav'] as const

export const voiceSettingsSchema = z.object({
  stability: z.number({ error: 'number' }).min(0, 'range01').max(1, 'range01').default(0.5),
  similarity: z.number({ error: 'number' }).min(0, 'range01').max(1, 'range01').default(0.75),
  style: z.number({ error: 'number' }).min(0, 'range01').max(1, 'range01').default(0),
  speed: z.number({ error: 'number' }).min(0.7, 'speedRange').max(1.2, 'speedRange').default(1),
})
export type VoiceSettingsInput = z.infer<typeof voiceSettingsSchema>

export const ttsSchema = z.object({
  text: z.string({ error: 'textRequired' }).refine((s) => s.trim().length > 0, 'textRequired').refine((s) => s.length <= TTS_MAX_CHARS, 'textTooLong'),
  voiceId: z.string({ error: 'voiceRequired' }).min(1, 'voiceRequired').max(64, 'voiceRequired'),
  model: z.string().max(64).optional(),
  settings: voiceSettingsSchema.default({ stability: 0.5, similarity: 0.75, style: 0, speed: 1 }),
  format: z.enum(OUTPUT_FORMATS, { error: 'format' }).default('mp3'),
  language: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, 'language').optional(),
  pronunciation: z.boolean().default(true),
  seed: z.string().max(64).optional(),
})
export type TtsInput = z.infer<typeof ttsSchema>

export const pronunciationRuleSchema = z.object({
  term: z.string().trim().min(1, 'termRequired').max(100, 'termTooLong'),
  type: z.enum(['alias', 'ipa']).default('alias'),
  replacement: z.string().trim().min(1, 'replacementRequired').max(200, 'replacementTooLong'),
  caseSensitive: z.boolean().default(false),
})
export type PronunciationRuleInput = z.infer<typeof pronunciationRuleSchema>

/** Credits for a TTS request: one per character of the text as typed. */
export function ttsCredits(text: string, creditsPerChar = 1): number {
  return Math.ceil(text.length * creditsPerChar)
}

/** Applies alias rules longest term first, on word boundaries. IPA rules are left to engines that read them. */
export function applyPronunciation(text: string, rules: Array<{ term: string; type: string; replacement: string; caseSensitive: boolean }>): string {
  const aliases = rules.filter((r) => r.type === 'alias').sort((a, b) => b.term.length - a.term.length)
  let out = text
  for (const r of aliases) {
    const esc = r.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, r.caseSensitive ? 'gu' : 'giu'), r.replacement)
  }
  return out
}
