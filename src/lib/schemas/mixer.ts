/**
 * Voice Mixer request schemas, shared by the mixer screen and the API.
 * Error messages are codes looked up in app.validation.
 */
import { z } from '@/lib/zod'
import { LICENCES } from '@/lib/schemas/voices'

const adjustValue = z.number({ error: 'number' }).min(-1, 'adjustRange').max(1, 'adjustRange').default(0)

export const mixSourcesSchema = z.object({
  sources: z.array(z.object({
    voiceId: z.string({ error: 'voiceRequired' }).min(1, 'voiceRequired').max(64, 'voiceRequired'),
    weight: z.number({ error: 'number' }).min(0, 'weightRange').max(1, 'weightRange'),
  }), { error: 'sourcesCount' }).min(2, 'sourcesCount').max(3, 'sourcesCount')
    .refine((s) => new Set(s.map((x) => x.voiceId)).size === s.length, 'sourcesDistinct')
    .refine((s) => Math.abs(s.reduce((t, x) => t + x.weight, 0) - 1) <= 0.011, 'weights')
    .refine((s) => s.every((x) => x.weight > 0), 'weightZero'),
  adjust: z.object({ pitch: adjustValue, pace: adjustValue, warmth: adjustValue }).default({ pitch: 0, pace: 0, warmth: 0 }),
})
export type MixSourcesInput = z.infer<typeof mixSourcesSchema>

export const mixSaveSchema = mixSourcesSchema.extend({
  name: z.string({ error: 'nameRequired' }).trim().min(1, 'nameRequired').max(60, 'nameTooLong'),
  description: z.string().trim().max(500, 'descriptionTooLong').default(''),
  /** Omitted: the most restrictive licence among the sources. */
  licence: z.enum(LICENCES).optional(),
})
export type MixSaveInput = z.infer<typeof mixSaveSchema>
