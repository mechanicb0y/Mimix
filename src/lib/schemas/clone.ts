import { z } from '@/lib/zod'
import { LICENCES } from '@/lib/schemas/voices'

export const CLONE_KINDS = ['instant', 'professional'] as const

export const createCloneSchema = z.object({
  kind: z.enum(CLONE_KINDS),
  name: z.string({ error: 'nameRequired' }).trim().min(1, 'nameRequired').max(60, 'nameTooLong'),
  description: z.string().trim().max(500, 'descriptionTooLong').default(''),
  language: z.string().regex(/^[a-z]{2,3}$/, 'language').default('en'),
  /** Remixing is off unless the owner turns it on (brief section 9). */
  licence: z.enum(LICENCES).default('private'),
  uploadIds: z.array(z.string().min(1).max(64), { error: 'fileRequired' }).min(1, 'fileRequired').max(25, 'filesTooMany'),
  rightsConfirmed: z.literal(true, { error: 'consentRequired' }),
})
export type CreateCloneInput = z.infer<typeof createCloneSchema>

export const verifyConsentSchema = z.object({
  consentId: z.string().min(1).max(64),
  uploadId: z.string({ error: 'recordingRequired' }).min(1, 'recordingRequired').max(64),
})
export type VerifyConsentInput = z.infer<typeof verifyConsentSchema>

/** CLONE_CONSENT=attest: the uploader confirms they are the speaker or have the speaker's written permission. */
export const attestConsentSchema = z.object({ attest: z.literal(true, { error: 'consentRequired' }) })

/** POST /voices/{id}/consent takes either a recording of the phrase or, in attest mode, the confirmation. */
export const consentSchema = z.union([attestConsentSchema, verifyConsentSchema])
