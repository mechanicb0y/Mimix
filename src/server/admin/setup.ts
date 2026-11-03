import 'server-only'
import { timingSafeEqual, createHash } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { z } from '@/lib/zod'
import { getAuth, PASSWORD_MAX, PASSWORD_MIN } from '@/server/auth'
import { isBreachedPassword } from '@/server/auth/breached'
import { getDb, schema } from '@/server/db'
import { env } from '@/server/env'
import { newId } from '@/server/ids'
import { audit } from '@/server/audit'
import { hit } from '@/server/rate-limit'
import { getSetting, setSetting } from '@/server/settings'
import { createPersonalWorkspace } from '@/server/workspaces'
import { UserError } from '@/server/api/errors'
import { getMessages } from '@/i18n'

/**
 * The super-admin's first deploy (brief section 8):
 *  1. `npm run admin:seed` creates the Owner account for ADMIN_EMAIL, with no password at all.
 *  2. The Owner opens /admin/setup and enters ADMIN_SETUP_TOKEN once to choose a password.
 *  3. After signing in, the console stays closed until two-factor sign-in is on.
 * No password is ever hard-coded, defaulted or printed.
 */

export async function seedSuperAdmin(): Promise<{ status: 'created' | 'exists'; userId: string }> {
  const e = env()
  if (!e.ADMIN_EMAIL) throw new Error('Set ADMIN_EMAIL first.')
  if (!e.ADMIN_SETUP_TOKEN) throw new Error('Set ADMIN_SETUP_TOKEN (at least 32 random characters) first.')
  const email = e.ADMIN_EMAIL.toLowerCase()
  const db = getDb()
  const [existing] = await db.select().from(schema.user).where(eq(schema.user.email, email))
  let userId = existing?.id
  if (!existing) {
    userId = newId('usr')
    await db.transaction(async (tx) => {
      await tx.insert(schema.user).values({ id: userId!, name: 'Mimix Owner', email, emailVerified: true, role: 'owner' })
      const ws = await createPersonalWorkspace({ id: userId!, name: 'Mimix Owner' }, tx)
      await tx.update(schema.workspace).set({ unlimited: true }).where(eq(schema.workspace.id, ws))
    })
  } else {
    await db.update(schema.user).set({ role: 'owner', emailVerified: true }).where(eq(schema.user.id, existing.id))
    const owned = await db.select({ id: schema.workspaceMember.workspaceId }).from(schema.workspaceMember)
      .where(and(eq(schema.workspaceMember.userId, existing.id), eq(schema.workspaceMember.role, 'owner')))
    for (const w of owned) await db.update(schema.workspace).set({ unlimited: true }).where(eq(schema.workspace.id, w.id))
  }
  await audit({ actorId: null, actorRole: 'system', action: existing ? 'admin.seed_confirmed' : 'admin.seeded', targetType: 'user', targetId: userId!, after: { role: 'owner' }, reason: 'ADMIN_EMAIL seed' })
  return { status: existing ? 'exists' : 'created', userId: userId! }
}

function sameToken(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export const setupSchema = z.object({
  email: z.string().trim().email('email'),
  token: z.string().min(1, 'token').max(500),
  password: z.string().min(PASSWORD_MIN, 'passwordShort').max(PASSWORD_MAX, 'passwordLong'),
})

/** Whether /admin/setup should show its form (seeded, not yet used, token configured). */
export async function setupAvailable(): Promise<boolean> {
  const e = env()
  if (!e.ADMIN_SETUP_TOKEN || !e.ADMIN_EMAIL) return false
  return !(await getSetting('adminSetup', true))
}

export async function completeSetup(input: z.infer<typeof setupSchema>, ip: string | null) {
  const e = env()
  const t = getMessages('en').errors.admin
  const rl = await hit(`admin-setup:${ip ?? 'unknown'}`, 5, 900)
  if (!rl.ok) throw new UserError('rate_limited', t.tooManyAttempts, 429)
  if (await getSetting('adminSetup', true)) throw new UserError('setup_done', t.setupDone, 409)
  if (!e.ADMIN_SETUP_TOKEN || !e.ADMIN_EMAIL || !sameToken(input.token, e.ADMIN_SETUP_TOKEN) || input.email.toLowerCase() !== e.ADMIN_EMAIL.toLowerCase()) {
    await audit({ actorId: null, actorRole: 'system', action: 'admin.setup_failed', ipAddress: ip })
    throw new UserError('setup_invalid', t.setupInvalid, 403)
  }
  const db = getDb()
  const [u] = await db.select().from(schema.user).where(eq(schema.user.email, e.ADMIN_EMAIL.toLowerCase()))
  if (!u) throw new UserError('setup_not_seeded', t.setupNotSeeded, 409)
  const [cred] = await db.select({ id: schema.account.id }).from(schema.account).where(and(eq(schema.account.userId, u.id), eq(schema.account.providerId, 'credential')))
  if (cred) throw new UserError('setup_done', t.setupDone, 409)
  if (await isBreachedPassword(input.password)) {
    const m = getMessages('en').errors.auth.breachedPassword
    throw new UserError('password_breached', m, 422, { password: m })
  }
  const hash = await (await getAuth().$context).password.hash(input.password)
  await db.transaction(async (tx) => {
    await tx.insert(schema.account).values({ id: newId('acc'), accountId: u.id, providerId: 'credential', userId: u.id, password: hash })
    await tx.update(schema.user).set({ role: 'owner', emailVerified: true, status: 'active' }).where(eq(schema.user.id, u.id))
  })
  await setSetting('adminSetup', { completedAt: new Date().toISOString(), userId: u.id }, u.id)
  await audit({ actorId: u.id, actorRole: 'owner', action: 'admin.setup_completed', targetType: 'user', targetId: u.id, ipAddress: ip })
}
