import { z } from '@/lib/zod'
import { EMAIL_RE } from '@/lib/validation'

export const REPORT_REASONS = ['no_consent', 'impersonation', 'harmful', 'copyright', 'other'] as const
export type ReportReason = (typeof REPORT_REASONS)[number]
export const REPORT_DETAILS_MAX = 2000
/** Distinct reporters saying a voice was cloned without consent before it's switched off pending review. */
export const REPORT_AUTO_DISABLE = 3
/** Largest clip the public provenance check accepts. */
export const PROVENANCE_MAX_BYTES = 25 * 1024 * 1024

/** Public report form. Signed-in reporters may leave the email empty. */
export const reportSchema = z.object({
  targetType: z.enum(['voice', 'generation'], { error: 'reportTarget' }),
  targetId: z.string({ error: 'reportTarget' }).trim().regex(/^(voice|lib|gen)_[A-Za-z0-9_-]{4,60}$/, 'reportTarget'),
  reason: z.enum(REPORT_REASONS, { error: 'reportReason' }),
  details: z.string().trim().max(REPORT_DETAILS_MAX, 'reportDetails').optional().default(''),
  email: z.string().trim().max(254, 'emailInvalid').refine((v) => v === '' || EMAIL_RE.test(v), 'emailInvalid').optional().default(''),
  /** Honeypot: people leave it empty. */
  website: z.string().max(500).optional().default(''),
})
