import { z } from '@/lib/zod'

export const LICENCES = ['remix', 'standard', 'private'] as const
export const GENDERS = ['female', 'male', 'neutral'] as const
export const AGES = ['young', 'middle', 'older'] as const
export const USE_CASES = ['narration', 'conversational', 'characters', 'advertising', 'education', 'news'] as const

export const voicePatchSchema = z.object({
  name: z.string().trim().min(1, 'nameRequired').max(60, 'nameTooLong').optional(),
  description: z.string().trim().max(500, 'descriptionTooLong').optional(),
  licence: z.enum(LICENCES).optional(),
  language: z.string().regex(/^[a-z]{2,3}$/, 'language').optional(),
  accent: z.string().trim().max(40).optional(),
  gender: z.enum(GENDERS).optional(),
  age: z.enum(AGES).optional(),
  useCase: z.enum(USE_CASES).optional(),
})

export const libraryQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  language: z.string().max(8).optional(),
  gender: z.enum(GENDERS).optional(),
  age: z.enum(AGES).optional(),
  accent: z.string().max(40).optional(),
  useCase: z.enum(USE_CASES).optional(),
  licence: z.enum(LICENCES).optional(),
  sort: z.enum(['name', 'newest']).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
})
