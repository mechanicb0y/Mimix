import { z } from '@/lib/zod'
import { EMAIL_RE } from '@/lib/validation'
import { PAID_PLAN_IDS, TOP_UPS } from '@/config/plans'

/** Roles an owner or admin can give. Ownership moves with transferOwnership, not a role change. */
export const ASSIGNABLE_ROLES = ['admin', 'member', 'viewer'] as const
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]

export const WORKSPACE_NAME_MAX = 80
export const INVITE_TTL_DAYS = 7
/** Days between asking to delete an account and the data being purged. */
export const DELETION_GRACE_DAYS = 30
/** How long a finished data export can be downloaded. */
export const EXPORT_TTL_DAYS = 7

const email = z.string({ error: 'emailRequired' }).trim().toLowerCase().min(1, 'emailRequired').max(254, 'emailInvalid').regex(EMAIL_RE, 'emailInvalid')

export const inviteSchema = z.object({ email, role: z.enum(ASSIGNABLE_ROLES, { error: 'role' }) })
export const roleSchema = z.object({ role: z.enum(ASSIGNABLE_ROLES, { error: 'role' }) })
export const acceptInviteSchema = z.object({ token: z.string({ error: 'required' }).min(20, 'required').max(200, 'required') })
export const workspacePatchSchema = z.object({ name: z.string({ error: 'nameRequired' }).trim().min(1, 'nameRequired').max(WORKSPACE_NAME_MAX, 'nameTooLong') })

export const notificationPrefsSchema = z.object({
  jobEmails: z.boolean().optional(),
  billingEmails: z.boolean().optional(),
  productEmails: z.boolean().optional(),
  lowCreditEmails: z.boolean().optional(),
})

export const checkoutSchema = z.object({
  plan: z.enum(PAID_PLAN_IDS as [string, ...string[]], { error: 'plan' }),
  period: z.enum(['monthly', 'annual'], { error: 'plan' }),
})
export const topUpSchema = z.object({ topUp: z.enum(TOP_UPS.map((t) => t.id) as [string, ...string[]], { error: 'topUp' }) })
export const cancelSchema = z.object({ cancel: z.boolean({ error: 'required' }) })

/** Deleting the account: the person types their email address to confirm. */
export const deleteAccountSchema = z.object({ confirmEmail: email })
