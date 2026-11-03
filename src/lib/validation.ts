/**
 * Form schemas shared by the browser and the server. Error codes map to strings in the messages,
 * so validation copy is translated like everything else.
 */
import { z } from '@/lib/zod'

export const DEMO_MAX_CHARS = 300
import { EMAIL_RE } from '@/lib/email'

export { EMAIL_RE }

export const emailField = z.string().trim().min(1, 'required').max(254, 'invalid').regex(EMAIL_RE, 'invalid')

export const newsletterSchema = z.object({ email: emailField })

export const TEAM_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'] as const

export const contactSalesSchema = z.object({
  name: z.string().trim().min(1, 'name').max(120, 'name'),
  email: z.string().trim().min(1, 'emailRequired').max(254, 'emailInvalid').regex(EMAIL_RE, 'emailInvalid'),
  company: z.string().trim().min(1, 'company').max(160, 'company'),
  size: z.enum(TEAM_SIZES, { error: 'size' }),
  useCase: z.string().trim().min(20, 'useCase').max(2000, 'useCase'),
  volume: z.string().trim().max(120).optional().default(''),
  consent: z.literal(true, { error: 'consent' }),
  /** Honeypot: real people leave it empty. */
  website: z.string().max(500).optional().default(''),
})
export type ContactSalesInput = z.infer<typeof contactSalesSchema>

export const demoTtsSchema = z.object({
  text: z.string().trim().min(1, 'empty').max(DEMO_MAX_CHARS, 'overLimit'),
  voiceId: z.string().min(1).max(40),
})

export const demoMixSchema = z.object({
  sources: z.array(z.object({ voiceId: z.string().min(1).max(40), weight: z.number().min(0).max(1) })).min(2).max(3),
  adjust: z.object({ pitch: z.number().min(-1).max(1), pace: z.number().min(-1).max(1), warmth: z.number().min(-1).max(1) }).partial().optional(),
})

/** Field name → first error code, for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
