import { describe, expect, it, vi, afterAll } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { symmetricEncrypt } from 'better-auth/crypto'
import { createOTP } from '@better-auth/utils/otp'

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))

import { POST as credits } from '@/app/api/admin/users/[id]/credits/route'
import { POST as status } from '@/app/api/admin/users/[id]/status/route'
import { POST as role } from '@/app/api/admin/users/[id]/role/route'
import { POST as twoFactor } from '@/app/api/admin/users/[id]/two-factor/route'
import { POST as reauth } from '@/app/api/admin/reauth/route'
import { POST as setup } from '@/app/api/admin/setup/route'
import { PUT as flag } from '@/app/api/admin/flags/[key]/route'
import { PUT as maintenance } from '@/app/api/admin/settings/maintenance/route'
import { GET as auditExport } from '@/app/api/admin/audit/export/route'
import { PUT as editPlanRoute, DELETE as resetPlanRoute } from '@/app/api/admin/plans/[id]/route'
import { GET as status_ } from '@/app/api/status/route'
import { POST as tts } from '@/app/api/v1/text-to-speech/route'
import { getAuth } from '@/server/auth'
import { getDb, schema } from '@/server/db'
import { newId } from '@/server/ids'
import { ipAllowed } from '@/server/admin/guard'
import { seedSuperAdmin } from '@/server/admin/setup'
import { forgetFlags } from '@/server/flags'
import { setSetting } from '@/server/settings'
import { refreshPlans } from '@/server/plans'
import { getPlan } from '@/config/plans'
import { ADMIN_PERMISSIONS } from '@/config/admin'
import { call, workspaceWithKey } from '../support/fixtures'
import { signedIn } from '../support/session'

const PASSWORD = 'correct horse battery staple'

/** A signed-in staff member with two-factor on (a real TOTP secret) and a fresh console session. */
async function staff(r: 'owner' | 'admin' | 'moderator' | 'support', opts: { twoFactor?: boolean; reauthed?: boolean } = {}) {
  const s = await signedIn({ name: `Staff ${r}` })
  const db = getDb()
  const secret = `JBSWY3DPEHPK3PXP${Math.random().toString(36).slice(2, 10).toUpperCase()}`
  if (opts.twoFactor !== false) {
    const ctx = await getAuth().$context
    await db.insert(schema.twoFactor).values({ id: newId('tf'), userId: s.userId, secret: await symmetricEncrypt({ key: ctx.secretConfig, data: secret }), backupCodes: '[]' })
  }
  await db.update(schema.user).set({ role: r, twoFactorEnabled: opts.twoFactor !== false }).where(eq(schema.user.id, s.userId))
  const sess = (await getAuth().api.getSession({ headers: new Headers({ cookie: s.cookie }), query: { disableCookieCache: true } }))?.session
  if (opts.reauthed) await db.insert(schema.adminSession).values({ sessionId: sess!.id, userId: s.userId, reauthAt: new Date() })
  return { ...s, sessionId: sess!.id, h: { cookie: s.cookie }, code: () => createOTP(secret, { period: 30, digits: 6 }).totp() }
}

async function auditRows(action: string, targetId: string) {
  return getDb().select().from(schema.auditLog).where(and(eq(schema.auditLog.action, action), eq(schema.auditLog.targetId, targetId)))
}

describe('admin access', () => {
  it('hides the console from users and requires two-factor for staff', async () => {
    const user = await signedIn()
    const target = await signedIn()
    const body = { workspaceId: target.workspaceId, amount: 100, reason: 'Goodwill credit' }
    expect((await call(credits, { headers: { cookie: user.cookie }, params: { id: target.userId }, json: body })).status).toBe(404)
    expect((await call(credits, { params: { id: target.userId }, json: body })).status).toBe(401)
    const no2fa = await staff('support', { twoFactor: false })
    const r = await call(credits, { headers: no2fa.h, params: { id: target.userId }, json: body })
    expect(r.status).toBe(403)
    expect(r.data.error.code).toBe('two_factor_required')
  })

  it('gives each role only its permissions', async () => {
    const target = await signedIn()
    const body = { workspaceId: target.workspaceId, amount: 250, reason: 'Goodwill credit' }
    const support = await staff('support', { reauthed: true })
    const moderator = await staff('moderator', { reauthed: true })
    expect((await call(credits, { headers: support.h, params: { id: target.userId }, json: body })).status).toBe(200)
    const m = await call(credits, { headers: moderator.h, params: { id: target.userId }, json: body })
    expect(m.status).toBe(403)
    expect(m.data.error.code).toBe('forbidden')
    // Support can't suspend; a moderator can suspend but not ban; only an Owner changes roles.
    expect((await call(status, { headers: support.h, params: { id: target.userId }, json: { status: 'suspended', reason: 'Spam reports' } })).status).toBe(403)
    expect((await call(status, { headers: moderator.h, params: { id: target.userId }, json: { status: 'banned', reason: 'Spam reports' } })).status).toBe(403)
    expect((await call(status, { headers: moderator.h, params: { id: target.userId }, json: { status: 'suspended', reason: 'Spam reports' } })).status).toBe(204)
    const admin = await staff('admin', { reauthed: true })
    expect((await call(role, { headers: admin.h, params: { id: target.userId }, json: { role: 'support', reason: 'New hire' } })).status).toBe(403)
    // The permission table matches the brief: only Owners manage roles.
    expect(ADMIN_PERMISSIONS.manageRoles).toEqual(['owner'])
  })

  it('audits credit adjustments with the reason and the balance change', async () => {
    const target = await signedIn({ credits: 1000 })
    const support = await staff('support')
    const r = await call(credits, { headers: support.h, params: { id: target.userId }, json: { workspaceId: target.workspaceId, amount: 4000, reason: 'Refund for outage' } })
    expect(r.status).toBe(200)
    expect(r.data.balance.plan).toBe(5000)
    const [row] = await auditRows('admin.credits_adjusted', target.workspaceId)
    expect(row).toMatchObject({ actorId: support.userId, actorRole: 'support', reason: 'Refund for outage' })
    expect(row!.before).toMatchObject({ plan: 1000 })
    expect(row!.after).toMatchObject({ plan: 5000, amount: 4000 })
    const short = await call(credits, { headers: support.h, params: { id: target.userId }, json: { workspaceId: target.workspaceId, amount: 1, reason: 'x' } })
    expect(short.status).toBe(422)
    expect(short.data.error.fields.reason).toBeTruthy()
  })

  it('protects Owners: only an Owner acts on an Owner, and nobody on themselves', async () => {
    const owner = await staff('owner', { reauthed: true })
    const other = await staff('owner', { reauthed: true })
    const admin = await staff('admin', { reauthed: true })
    const a = await call(status, { headers: admin.h, params: { id: owner.userId }, json: { status: 'suspended', reason: 'Testing rules' } })
    expect(a.status).toBe(403)
    expect(a.data.error.code).toBe('owner_only')
    const self = await call(role, { headers: owner.h, params: { id: owner.userId }, json: { role: 'admin', reason: 'Testing rules' } })
    expect(self.status).toBe(409)
    expect(self.data.error.code).toBe('not_yourself')
    // Another Owner can demote, and the change signs the account out.
    expect((await call(role, { headers: owner.h, params: { id: other.userId }, json: { role: 'admin', reason: 'Stepping back' } })).status).toBe(204)
    expect(await getDb().select().from(schema.session).where(eq(schema.session.userId, other.userId))).toHaveLength(0)
    expect(await auditRows('admin.role_changed', other.userId)).toHaveLength(1)
  })

  it('lets staff act only on accounts with a lower role', async () => {
    const moderator = await staff('moderator', { reauthed: true })
    const support = await staff('support', { reauthed: true })
    const admin = await staff('admin', { reauthed: true })
    const otherMod = await staff('moderator', { reauthed: true })
    // A Moderator can't suspend an Admin or another Moderator, but can suspend Support.
    for (const target of [admin, otherMod]) {
      const r = await call(status, { headers: moderator.h, params: { id: target.userId }, json: { status: 'suspended', reason: 'Testing rank rules' } })
      expect(r.status).toBe(403)
      expect(r.data.error.code).toBe('lower_role_only')
    }
    // Support can't adjust an Admin's credits.
    const c = await call(credits, { headers: support.h, params: { id: admin.userId }, json: { workspaceId: admin.workspaceId, amount: 100, reason: 'Testing rank rules' } })
    expect(c.data.error.code).toBe('lower_role_only')
    expect((await call(status, { headers: moderator.h, params: { id: support.userId }, json: { status: 'suspended', reason: 'Testing rank rules' } })).status).toBe(204)
    const [s] = await getDb().select({ status: schema.user.status }).from(schema.user).where(eq(schema.user.id, admin.userId))
    expect(s!.status).toBe('active')
  })

  it('needs an Owner to reset two-factor on any staff account', async () => {
    const support = await staff('support', { reauthed: true })
    const admin = await staff('admin', { reauthed: true })
    const owner = await staff('owner', { reauthed: true })
    const mod = await staff('moderator', { reauthed: true })
    const user = await signedIn()
    await getDb().update(schema.user).set({ twoFactorEnabled: true }).where(eq(schema.user.id, user.userId))
    // Support resetting an Admin: blocked by rank. An Admin resetting a Moderator: blocked because the target is staff.
    expect((await call(twoFactor, { headers: support.h, params: { id: admin.userId }, json: { reason: 'Lost phone, ID checked' } })).data.error.code).toBe('lower_role_only')
    expect((await call(twoFactor, { headers: admin.h, params: { id: mod.userId }, json: { reason: 'Lost phone, ID checked' } })).data.error.code).toBe('owner_for_2fa')
    const [still] = await getDb().select({ on: schema.user.twoFactorEnabled }).from(schema.user).where(eq(schema.user.id, mod.userId))
    expect(still!.on).toBe(true)
    // Support can still help an ordinary user; an Owner can reset staff.
    expect((await call(twoFactor, { headers: support.h, params: { id: user.userId }, json: { reason: 'Lost phone, ID checked' } })).status).toBe(204)
    expect((await call(twoFactor, { headers: owner.h, params: { id: mod.userId }, json: { reason: 'Lost phone, ID checked' } })).status).toBe(204)
    expect(await auditRows('admin.two_factor_reset', mod.userId)).toHaveLength(1)
  })

  it('asks for the password again before destructive actions, and locks after 15 idle minutes', async () => {
    const admin = await staff('admin')
    const target = await signedIn()
    const body = { status: 'suspended', reason: 'Abuse report' }
    const first = await call(status, { headers: admin.h, params: { id: target.userId }, json: body })
    expect(first.status).toBe(428)
    expect(first.data.error.code).toBe('reauth_required')
    expect((await call(reauth, { headers: admin.h, json: { password: 'wrong password!', code: await admin.code() } })).data.error.code).toBe('wrong_password')
    expect((await call(reauth, { headers: admin.h, json: { password: PASSWORD } })).data.error.code).toBe('code_required')
    expect((await call(reauth, { headers: admin.h, json: { password: PASSWORD, code: '000000' } })).data.error.code).toBe('wrong_code')
    expect((await call(reauth, { headers: admin.h, json: { password: PASSWORD, code: await admin.code() } })).status).toBe(204)
    expect((await call(status, { headers: admin.h, params: { id: target.userId }, json: body })).status).toBe(204)

    await getDb().update(schema.adminSession).set({ lastSeenAt: new Date(Date.now() - 16 * 60_000) }).where(eq(schema.adminSession.sessionId, admin.sessionId))
    const locked = await call(credits, { headers: admin.h, params: { id: target.userId }, json: { workspaceId: target.workspaceId, amount: 5, reason: 'After lunch' } })
    expect(locked.status).toBe(423)
    expect((await call(reauth, { headers: admin.h, json: { password: PASSWORD, code: await admin.code() } })).status).toBe(204)
    expect((await call(credits, { headers: admin.h, params: { id: target.userId }, json: { workspaceId: target.workspaceId, amount: 5, reason: 'After lunch' } })).status).toBe(200)
  })

  it('checks the optional IP allowlist', () => {
    expect(ipAllowed('203.0.113.9', '')).toBe(true)
    expect(ipAllowed('203.0.113.9', '203.0.113.0/24, 10.0.0.1')).toBe(true)
    expect(ipAllowed('::ffff:10.0.0.1', '203.0.113.0/24, 10.0.0.1')).toBe(true)
    expect(ipAllowed('198.51.100.1', '203.0.113.0/24')).toBe(false)
    expect(ipAllowed(null, '203.0.113.0/24')).toBe(false)
  })
})

describe('super-admin setup', () => {
  // auth.test.ts signs up ADMIN_EMAIL itself, so leave no trace of the seeded Owner.
  afterAll(async () => {
    await getDb().delete(schema.user).where(eq(schema.user.email, 'owner@example.test'))
    await getDb().delete(schema.systemSetting).where(eq(schema.systemSetting.key, 'adminSetup'))
  })

  it('seeds the Owner from ADMIN_EMAIL and accepts the setup token once', async () => {
    const seeded = await seedSuperAdmin()
    const [u] = await getDb().select().from(schema.user).where(eq(schema.user.id, seeded.userId))
    expect(u).toMatchObject({ email: 'owner@example.test', role: 'owner' })
    const [ws] = await getDb().select().from(schema.workspace).innerJoin(schema.workspaceMember, eq(schema.workspaceMember.workspaceId, schema.workspace.id)).where(eq(schema.workspaceMember.userId, seeded.userId))
    expect(ws!.workspace.unlimited).toBe(true)
    const pw = 'a long and unusual owner passphrase 7'
    const bad = await call(setup, { json: { email: 'owner@example.test', token: 'not-the-token', password: pw } })
    expect(bad.data.error.code).toBe('setup_invalid')
    const ok = await call(setup, { json: { email: 'owner@example.test', token: process.env.ADMIN_SETUP_TOKEN, password: pw } })
    expect(ok.status).toBe(204)
    const again = await call(setup, { json: { email: 'owner@example.test', token: process.env.ADMIN_SETUP_TOKEN, password: 'another passphrase that is long' } })
    expect(again.data.error.code).toBe('setup_done')
    // The password works, and the console still needs two-factor before it opens.
    const login = await getAuth().api.signInEmail({ body: { email: 'owner@example.test', password: pw }, asResponse: true })
    expect(login.status).toBe(200)
    const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
    const r = await call(credits, { headers: { cookie }, params: { id: seeded.userId }, json: { workspaceId: 'x', amount: 1, reason: 'Testing setup' } })
    expect(r.data.error.code).toBe('two_factor_required')
  })
})

describe('flags, banner and maintenance', () => {
  afterAll(async () => {
    await getDb().delete(schema.featureFlag)
    forgetFlags()
    await setSetting('maintenance', { active: false, message: '' }, null)
  })

  it('switches a tool off for everyone except named users', async () => {
    const admin = await staff('admin', { reauthed: true })
    const w = await workspaceWithKey()
    const body = { text: 'Hello there', voiceId: 'lib_wren', format: 'mp3' }
    expect((await call(flag, { headers: admin.h, params: { key: 'speech' }, method: 'PUT', json: { enabled: false } })).status).toBe(204)
    const off = await call(tts, { key: w.key, json: body })
    expect(off.status).toBe(403)
    expect(off.data.error.code).toBe('feature_off')
    expect((await call(flag, { headers: admin.h, params: { key: 'speech' }, method: 'PUT', json: { enabled: false, userIds: [w.userId] } })).status).toBe(204)
    expect((await call(tts, { key: w.key, json: body })).status).toBeLessThan(300)
    // Plan rollout: on for Pro only.
    const free = await workspaceWithKey({ plan: 'free' })
    await call(flag, { headers: admin.h, params: { key: 'speech' }, method: 'PUT', json: { enabled: true, plans: ['pro'] } })
    expect((await call(tts, { key: free.key, json: body })).data.error.code).toBe('feature_off')
    expect((await call(tts, { key: w.key, json: body })).status).toBeLessThan(300)
    const bad = await call(flag, { headers: admin.h, params: { key: 'speech' }, method: 'PUT', json: { enabled: true, userIds: ['usr_missing'] } })
    expect(bad.status).toBe(422)
    expect(await auditRows('flag.edited', 'speech')).toHaveLength(3)
  })

  it('closes the API to everyone but staff during maintenance', async () => {
    const admin = await staff('admin', { reauthed: true })
    const w = await workspaceWithKey()
    expect((await call(maintenance, { headers: admin.h, method: 'PUT', json: { active: true, message: 'Back at 10:00 UTC', reason: 'Database upgrade' } })).status).toBe(204)
    const r = await call(tts, { key: w.key, json: { text: 'Hello there', voiceId: 'lib_wren', format: 'mp3' } })
    expect(r.status).toBe(503)
    expect(r.data.error.code).toBe('maintenance')
    expect((await call(status_)).data.maintenance).toEqual({ message: 'Back at 10:00 UTC' })
    expect((await call(maintenance, { headers: admin.h, method: 'PUT', json: { active: false, message: '', reason: 'Upgrade finished' } })).status).toBe(204)
    expect((await call(tts, { key: w.key, json: { text: 'Hello there', voiceId: 'lib_wren', format: 'mp3' } })).status).toBeLessThan(300)
  })
})

describe('plans and audit export', () => {
  it.skipIf(!process.env.STRIPE_API_BASE)('edits a plan, syncs Stripe prices, and resets to defaults', async () => {
    const admin = await staff('admin', { reauthed: true })
    const before = getPlan('maker')
    const r = await call(editPlanRoute, { headers: admin.h, params: { id: 'maker' }, method: 'PUT', json: {
      monthly: 1100, annualPerMonth: 880, creditsPerMonth: 60_000, seats: 1, customVoices: 12, professionalClones: 0, mixerSources: 3, reason: 'Price test',
    } })
    expect(r.status).toBe(200)
    expect(r.data.stripePrices.length).toBe(2)
    await refreshPlans(true)
    expect(getPlan('maker')).toMatchObject({ creditsPerMonth: 60_000, customVoices: 12, prices: { USD: { monthly: 1100, annualPerMonth: 880 } } })
    const wrong = await call(editPlanRoute, { headers: admin.h, params: { id: 'maker' }, method: 'PUT', json: {
      monthly: 1100, annualPerMonth: 1500, creditsPerMonth: 60_000, seats: 1, customVoices: 12, professionalClones: 0, mixerSources: 3, reason: 'Price test',
    } })
    expect(wrong.status).toBe(422)
    expect((await call(resetPlanRoute, { headers: admin.h, params: { id: 'maker' }, method: 'DELETE', json: { reason: 'Back to defaults' } })).status).toBe(204)
    await refreshPlans(true)
    expect(getPlan('maker')).toEqual(before)
  })

  it('exports the audit log as CSV with formula cells neutralised', async () => {
    const owner = await staff('owner', { reauthed: true })
    const target = await signedIn()
    await call(credits, { headers: owner.h, params: { id: target.userId }, json: { workspaceId: target.workspaceId, amount: 10, reason: '=HYPERLINK("http://evil")' } })
    const r = await auditExport(new Request(`http://localhost:3000/api/admin/audit/export?action=admin.credits&target=${target.workspaceId}`, { headers: owner.h }), { params: Promise.resolve({}) })
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toMatch(/text\/csv/)
    const text = await r.text()
    const lines = text.trim().split('\r\n')
    expect(lines[0]).toMatch(/^id,created_at,actor_id/)
    expect(lines).toHaveLength(2)
    expect(text).toContain(`"'=HYPERLINK(""http://evil"")"`)
    const support = await staff('support')
    const denied = await auditExport(new Request('http://localhost:3000/api/admin/audit/export', { headers: support.h }), { params: Promise.resolve({}) })
    expect(denied.status).toBe(403)
    expect(await auditRows('audit.exported', '')).toBeDefined()
  })
})
