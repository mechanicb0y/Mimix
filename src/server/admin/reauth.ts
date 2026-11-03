import 'server-only'
import { and, eq } from 'drizzle-orm'
import { symmetricDecrypt } from 'better-auth/crypto'
import { createOTP } from '@better-auth/utils/otp'
import { getAuth } from '@/server/auth'
import { getDb, schema } from '@/server/db'
import { hit } from '@/server/rate-limit'
import { audit } from '@/server/audit'
import { UserError } from '@/server/api/errors'
import { getMessages } from '@/i18n'

const t = () => getMessages('en').errors.admin

/** Checks a user's password against their email-and-password account. */
export async function verifyPassword(userId: string, password: string): Promise<boolean> {
  const [acc] = await getDb().select({ hash: schema.account.password }).from(schema.account)
    .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, 'credential')))
  if (!acc?.hash) return false
  const ctx = await getAuth().$context
  return ctx.password.verify({ hash: acc.hash, password })
}

/** Checks a current TOTP code from the user's authenticator app. */
export async function verifyTotp(userId: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false
  const [tf] = await getDb().select({ secret: schema.twoFactor.secret }).from(schema.twoFactor).where(eq(schema.twoFactor.userId, userId))
  if (!tf) return false
  const ctx = await getAuth().$context
  const secret = await symmetricDecrypt({ key: ctx.secretConfig, data: tf.secret })
  return createOTP(secret, { period: 30, digits: 6 }).verify(code)
}

/**
 * Re-authentication for the admin console: unlocks an idle console and allows destructive actions
 * for the next few minutes. Needs the password and, when two-factor is on, a current code.
 * Five tries per five minutes per account.
 */
export async function reauthenticate(actor: { id: string; role: string; sessionId: string; ip: string | null; twoFactorEnabled: boolean }, input: { password: string; code?: string }) {
  const rl = await hit(`admin-reauth:${actor.id}`, 5, 300)
  if (!rl.ok) throw new UserError('rate_limited', t().tooManyAttempts, 429)
  if (!(await verifyPassword(actor.id, input.password))) {
    await audit({ actorId: actor.id, actorRole: actor.role, action: 'admin.reauth_failed', targetType: 'user', targetId: actor.id, ipAddress: actor.ip, after: { why: 'password' } })
    throw new UserError('wrong_password', t().wrongPassword, 422, { password: t().wrongPassword })
  }
  if (actor.twoFactorEnabled) {
    if (!input.code) throw new UserError('code_required', t().codeRequired, 422, { code: t().codeRequired })
    if (!(await verifyTotp(actor.id, input.code))) {
      await audit({ actorId: actor.id, actorRole: actor.role, action: 'admin.reauth_failed', targetType: 'user', targetId: actor.id, ipAddress: actor.ip, after: { why: 'code' } })
      throw new UserError('wrong_code', t().wrongCode, 422, { code: t().wrongCode })
    }
  }
  const now = new Date()
  await getDb().insert(schema.adminSession).values({ sessionId: actor.sessionId, userId: actor.id, lastSeenAt: now, reauthAt: now, ipAddress: actor.ip })
    .onConflictDoUpdate({ target: schema.adminSession.sessionId, set: { lastSeenAt: now, reauthAt: now, ipAddress: actor.ip } })
  await audit({ actorId: actor.id, actorRole: actor.role, action: 'admin.reauth', targetType: 'user', targetId: actor.id, ipAddress: actor.ip })
}
