import { z } from '@/lib/zod'
import { OUTPUT_FORMATS } from '@/lib/schemas/tts'
import { ENGINE_LIMITS } from '@/config/engine-limits'

export const SFX_PROMPT_MAX = 450
export const SFX_MIN_SECONDS = 0.5
export const SFX_MAX_SECONDS = ENGINE_LIMITS.sfxMaxSeconds.value

export const sttSchema = z.object({
  uploadId: z.string({ error: 'fileRequired' }).min(1, 'fileRequired').max(64),
  language: z.string().regex(/^[a-z]{2,3}$/, 'language').optional(),
  /** Expected speakers; detected when omitted. */
  speakers: z.number().int().min(1).max(32).optional(),
  declaredMs: z.number().int().min(0).optional(),
})
export type SttInput = z.infer<typeof sttSchema>

export const transcriptPatchSchema = z.object({
  title: z.string().trim().min(1, 'nameRequired').max(120, 'titleTooLong').optional(),
  /** Display names for speaker labels, e.g. { "Speaker 1": "Dana" }. */
  speakerNames: z.record(z.string().max(40), z.string().trim().max(60, 'nameTooLong')).optional(),
})

export const sfxSchema = z.object({
  prompt: z.string({ error: 'promptRequired' }).trim().min(1, 'promptRequired').max(SFX_PROMPT_MAX, 'promptTooLong'),
  /** Omitted: the engine picks a length. */
  seconds: z.number({ error: 'number' }).min(SFX_MIN_SECONDS, 'duration').max(SFX_MAX_SECONDS, 'duration').optional(),
  promptInfluence: z.number({ error: 'number' }).min(0, 'range01').max(1, 'range01').default(0.3),
  format: z.enum(OUTPUT_FORMATS, { error: 'format' }).default('mp3'),
})
export type SfxInput = z.infer<typeof sfxSchema>

export const isolatorSchema = z.object({
  uploadId: z.string({ error: 'fileRequired' }).min(1, 'fileRequired').max(64),
  format: z.enum(OUTPUT_FORMATS, { error: 'format' }).default('mp3'),
  declaredMs: z.number().int().min(0).optional(),
})
export type IsolatorInput = z.infer<typeof isolatorSchema>
