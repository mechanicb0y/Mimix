import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { twoFactor } from 'better-auth/plugins/two-factor'
import { eq, sql } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import { env } from '@/server/env'
import { sendEmail } from '@/server/email'
import { isBreachedPassword } from '@/server/auth/breached'
import { createPersonalWorkspace, promoteSuperAdminIfVerified } from '@/server/workspaces'
import { audit } from '@/server/audit'
import { getMessages, fmt } from '@/i18n'
import { isStaff } from '@/config/admin'

/**
 * Authentication (Better Auth on our own Postgres).
 * - Email + password: at least 10 characters, breached-password check, email verification required.
 * - Password reset: single-use token, 30-minute expiry, signs out every session.
 * - Google sign-in when GOOGLE_CLIENT_ID/SECRET are set.
 * - TOTP two-factor with backup codes.
 * - Rate limits per IP (database-backed, so they hold across server instances) and account lockout
 *   after LOCKOUT.maxFailures failed sign-ins.
 */
export const LOCKOUT = { maxFailures: 5, minutes: 15 } as const
export const PASSWORD_MIN = 10
export const PASSWORD_MAX = 128

const PASSWORD_PATHS = new Set(['/sign-up/email', '/reset-password', '/change-password'])

function mail() { return getMessages('en').emails }

async function emailUser(to: string, kind: 'verify' | 'reset' | 'passwordChanged' | 'locked' | 'changeEmail' | 'adminSignIn', values: Record<string, string | number>) {
  const m = mail()
  const t = m[kind]
  await sendEmail({ to, subject: fmt(t.subject, values), text: `${fmt(t.body, values)}\n\n${m.footer}`, tag: kind })
}

function createAuth() {
  const e = env()
  const db = getDb()
  const authErrors = getMessages('en').errors.auth

  return betterAuth({
    appName: 'Mimix',
    baseURL: e.APP_URL,
    secret: e.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification, twoFactor: schema.twoFactor, rateLimit: schema.rateLimit },
    }),
    user: {
      // Changing email: the current address approves first, then the new address is verified.
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
          await emailUser(user.email, 'changeEmail', { name: user.name, newEmail, url })
          await audit({ actorId: user.id, action: 'auth.email_change_requested', targetType: 'user', targetId: user.id, after: { newEmail } })
        },
      },
      additionalFields: {
        role: { type: 'string', input: false, defaultValue: 'user' },
        status: { type: 'string', input: false, defaultValue: 'active' },
        defaultWorkspaceId: { type: 'string', input: false, required: false },
        locale: { type: 'string', input: false, defaultValue: 'en' },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN,
      maxPasswordLength: PASSWORD_MAX,
      requireEmailVerification: true,
      autoSignIn: false,
      resetPasswordTokenExpiresIn: 60 * 30,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await emailUser(user.email, 'reset', { name: user.name, url })
      },
      onPasswordReset: async ({ user }) => {
        await emailUser(user.email, 'passwordChanged', { name: user.name, url: `${e.APP_URL}/forgot-password` })
        await audit({ actorId: user.id, action: 'auth.password_reset', targetType: 'user', targetId: user.id })
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        await emailUser(user.email, 'verify', { name: user.name, url })
      },
    },
    socialProviders: e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET, prompt: 'select_account' } }
      : {},
    account: { accountLinking: { enabled: true, trustedProviders: ['google'] } },
    rateLimit: {
      enabled: e.NODE_ENV !== 'test' || process.env.AUTH_RATE_LIMIT === '1',
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
        '/sign-up/email': { window: 600, max: 5 },
        '/request-password-reset': { window: 600, max: 5 },
        '/forget-password': { window: 600, max: 5 },
        '/send-verification-email': { window: 600, max: 5 },
        '/two-factor/verify-totp': { window: 60, max: 10 },
        '/two-factor/verify-backup-code': { window: 60, max: 5 },
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'] },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const body = (ctx.body ?? {}) as { email?: string; password?: string; newPassword?: string }
        if (PASSWORD_PATHS.has(ctx.path)) {
          const pw = ctx.path === '/sign-up/email' ? body.password : body.newPassword
          if (typeof pw === 'string' && pw.length >= PASSWORD_MIN && await isBreachedPassword(pw)) {
            throw new APIError('BAD_REQUEST', { message: authErrors.breachedPassword, code: 'PASSWORD_BREACHED' })
          }
        }
        if (ctx.path === '/sign-in/email' && typeof body.email === 'string') {
          const [u] = await db.select({ status: schema.user.status, lockedUntil: schema.user.lockedUntil })
            .from(schema.user).where(eq(schema.user.email, body.email.toLowerCase()))
          if (u?.status === 'suspended' || u?.status === 'banned') {
            throw new APIError('FORBIDDEN', { message: authErrors.accountSuspended, code: 'ACCOUNT_SUSPENDED' })
          }
          if (u?.lockedUntil && u.lockedUntil > new Date()) {
            const minutes = Math.max(1, Math.ceil((u.lockedUntil.getTime() - Date.now()) / 60_000))
            throw new APIError('TOO_MANY_REQUESTS', { message: fmt(authErrors.locked, { minutes }), code: 'ACCOUNT_LOCKED' })
          }
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/sign-in/email') return
        const email = ((ctx.body ?? {}) as { email?: string }).email?.toLowerCase()
        if (!email) return
        const returned = ctx.context.returned
        const failed = returned instanceof APIError && (returned.status === 'UNAUTHORIZED' || returned.statusCode === 401)
        if (!failed) {
          if (!(returned instanceof Error)) await db.update(schema.user).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(schema.user.email, email))
          return
        }
        const [u] = await db.update(schema.user)
          .set({ failedLoginCount: sql`${schema.user.failedLoginCount} + 1` })
          .where(eq(schema.user.email, email))
          .returning({ id: schema.user.id, name: schema.user.name, count: schema.user.failedLoginCount })
        if (u && u.count >= LOCKOUT.maxFailures) {
          await db.update(schema.user).set({ lockedUntil: new Date(Date.now() + LOCKOUT.minutes * 60_000), failedLoginCount: 0 }).where(eq(schema.user.id, u.id))
          await emailUser(email, 'locked', { name: u.name, count: u.count, minutes: LOCKOUT.minutes, url: `${e.APP_URL}/forgot-password` })
          await audit({ actorId: null, actorRole: 'system', action: 'auth.locked', targetType: 'user', targetId: u.id, after: { minutes: LOCKOUT.minutes } })
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await createPersonalWorkspace({ id: user.id, name: user.name })
            await promoteSuperAdminIfVerified(user)
          },
        },
        update: {
          after: async (user) => {
            if (user.emailVerified) await promoteSuperAdminIfVerified(user)
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const [u] = await db.select({ status: schema.user.status }).from(schema.user).where(eq(schema.user.id, session.userId))
            if (u && u.status !== 'active') return false
            return { data: session }
          },
          // Brief section 8: every new sign-in by a staff account emails that account.
          after: async (session) => {
            const [u] = await db.select({ name: schema.user.name, email: schema.user.email, role: schema.user.role }).from(schema.user).where(eq(schema.user.id, session.userId))
            if (!u || !isStaff(u.role)) return
            const values = { name: u.name, role: u.role, time: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC', ip: session.ipAddress || '—', agent: session.userAgent || '—', url: `${e.APP_URL}/forgot-password` }
            await emailUser(u.email, 'adminSignIn', values)
            await audit({ actorId: session.userId, actorRole: u.role, action: 'admin.sign_in', targetType: 'user', targetId: session.userId, ipAddress: session.ipAddress ?? null })
          },
        },
      },
    },
    plugins: [twoFactor({ issuer: 'Mimix', skipVerificationOnEnable: false }), nextCookies()],
  })
}

type Auth = ReturnType<typeof createAuth>
const g = globalThis as unknown as { mimixAuth?: Auth }

/** The auth instance, created on first use so builds never touch the database. */
export function getAuth(): Auth {
  if (!g.mimixAuth) g.mimixAuth = createAuth()
  return g.mimixAuth
}
