import { z } from '@/lib/zod'
import { FORM_LANGUAGES } from '@/config/languages'

/** Most target languages in one project. Each language is charged separately. */
export const DUB_MAX_TARGETS = 5
export const DUB_LINE_MAX = 1000
export const DUB_TITLE_MAX = 120

const lang = z.enum(FORM_LANGUAGES, { error: 'language' })

export const dubCreateSchema = z.object({
  uploadId: z.string({ error: 'fileRequired' }).min(1, 'fileRequired').max(64),
  title: z.string().trim().max(DUB_TITLE_MAX, 'titleTooLong').optional(),
  /** Spoken language of the source; detected when omitted. */
  sourceLanguage: lang.optional(),
  targetLanguages: z.array(lang, { error: 'languages' }).min(1, 'languages').max(DUB_MAX_TARGETS, 'targetsTooMany'),
  /** Expected number of speakers; detected when omitted. */
  speakers: z.number().int().min(1).max(10).optional(),
  /** Keep music and effects under the new voices. */
  keepBackground: z.boolean().default(true),
  declaredMs: z.number().int().min(0).optional(),
}).refine((v) => !v.sourceLanguage || !v.targetLanguages.includes(v.sourceLanguage), { message: 'sameLanguage', path: ['targetLanguages'] })
  .refine((v) => new Set(v.targetLanguages).size === v.targetLanguages.length, { message: 'targetsDuplicate', path: ['targetLanguages'] })
export type DubCreateInput = z.infer<typeof dubCreateSchema>

const line = z.object({
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  speaker: z.string().min(1).max(40),
  text: z.string().trim().max(DUB_LINE_MAX, 'lineTooLong'),
}).refine((s) => s.endMs > s.startMs, { message: 'timing', path: ['endMs'] })

/** Edits before re-rendering: the cast, a title, and translated lines for one language. */
export const dubPatchSchema = z.object({
  title: z.string().trim().min(1, 'nameRequired').max(DUB_TITLE_MAX, 'titleTooLong').optional(),
  cast: z.record(z.string().max(40), z.string().min(1).max(64)).optional(),
  language: lang.optional(),
  segments: z.array(line).max(5000).optional(),
}).refine((v) => !v.segments || v.language, { message: 'languageRequired', path: ['language'] })
export type DubPatchInput = z.infer<typeof dubPatchSchema>

export const dubRenderSchema = z.object({ language: lang })
