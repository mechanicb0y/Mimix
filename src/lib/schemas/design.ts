import { z } from '@/lib/zod'
import { LICENCES } from '@/lib/schemas/voices'

export const DESIGN_DESCRIPTION_MIN = 20
export const DESIGN_DESCRIPTION_MAX = 1000
export const DESIGN_PREVIEW_MAX = 300
export const DESIGN_GENDERS = ['any', 'female', 'male'] as const
export const DESIGN_AGES = ['any', 'young', 'middle', 'older'] as const
export const DESIGN_PITCHES = ['low', 'medium', 'high'] as const
export const DESIGN_PACES = ['slow', 'normal', 'fast'] as const
export const DESIGN_WARMTHS = ['warm', 'neutral', 'bright'] as const

export const designSchema = z.object({
  description: z.string({ error: 'descriptionTooShort' }).trim().min(DESIGN_DESCRIPTION_MIN, 'descriptionTooShort').max(DESIGN_DESCRIPTION_MAX, 'designDescriptionTooLong'),
  /** What the previews say; a fixed line when empty. */
  previewText: z.string().trim().max(DESIGN_PREVIEW_MAX, 'previewTooLong').default(''),
  language: z.string().regex(/^[a-z]{2,3}$/, 'language').default('en'),
  /** Picked in the form. Engines that design from text read the description; Kokoro reads these first. */
  traits: z.object({
    gender: z.enum(DESIGN_GENDERS).optional(),
    age: z.enum(DESIGN_AGES).optional(),
    accent: z.string().regex(/^[a-z]{2,20}$/).optional(),
    pitch: z.enum(DESIGN_PITCHES).optional(),
    pace: z.enum(DESIGN_PACES).optional(),
    warmth: z.enum(DESIGN_WARMTHS).optional(),
  }).default({}),
})
export type DesignInput = z.infer<typeof designSchema>

export const designSaveSchema = z.object({
  designId: z.string().min(1).max(64),
  candidate: z.number().int().min(0).max(2),
  name: z.string({ error: 'nameRequired' }).trim().min(1, 'nameRequired').max(60, 'nameTooLong'),
  description: z.string().trim().max(500, 'descriptionTooLong').default(''),
  licence: z.enum(LICENCES).default('private'),
})
export type DesignSaveInput = z.infer<typeof designSaveSchema>
