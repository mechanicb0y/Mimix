import { z } from '@/lib/zod'
import { OUTPUT_FORMATS } from '@/lib/schemas/tts'

export const changerSchema = z.object({
  uploadId: z.string({ error: 'fileRequired' }).min(1, 'fileRequired').max(64),
  voiceId: z.string({ error: 'voiceRequired' }).min(1, 'voiceRequired').max(64),
  format: z.enum(OUTPUT_FORMATS, { error: 'format' }).default('mp3'),
  /** Strip background noise from the source before converting. */
  removeBackground: z.boolean().default(false),
  /** Duration the browser measured, for an early credit check. The charge uses the measured length. */
  declaredMs: z.number().int().min(0).optional(),
})
export type ChangerInput = z.infer<typeof changerSchema>
