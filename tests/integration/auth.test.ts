import { first } from '../support/first'
import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { getAuth, LOCKOUT } from '@/server/auth'
import { getDb, schema } from '@/server/db'
import { readOutbox } from '@/server/email'
import { getBalance } from '@/server/credits'

const PASSWORD = 'correct horse battery staple'
let n = 0
const email = () => `user${Date.now()}${n++}@example.test`

async function signUp(addr: string, password = PASSWORD) {
  return getAuth().api.signUpEmail({ body: { email: addr, password, name: 'Dana Lee' } })
}

function tokenFrom(text: string): string {
  const url = new URL(text.match(/https?:\/\/\S+/)![0])
  return url.searchParams.get('token') ?? url.pathname.split('/').pop()!
}

async function verify(addr: string) {
  const mail = first(await readOutbox({ to: addr, tag: 'verify' }))
  expect(mail, 'verification email sent').toBeTruthy()
  await getAuth().api.verifyEmail({ query: { token: tokenFrom(mail.text) } })
}

function cookieOf(res: Response): string {
  return (res.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
}

async function signIn(addr: string, password = PASSWORD) {
  return getAuth().api.signInEmail({ body: { email: addr, password }, asResponse: true })
}

describe('sign-up', () => {
  it('creates a Free workspace with 10,000 credits and sends a verification email', async () => {
    const addr = email()
    const res = await signUp(addr)
    const u = first(await getDb().select().from(schema.user).where(eq(schema.user.id, res.user.id)))
    expect(u.emailVerified).toBe(false)
    expect(u.defaultWorkspaceId).toBeTruthy()
    const bal = await getBalance(u.defaultWorkspaceId!)
    expect(bal.total).toBe(10_000)
    const member = first(await getDb().select().from(schema.workspaceMember).where(eq(schema.workspaceMember.userId, u.id)))
    expect(member.role).toBe('owner')
    expect(await readOutbox({ to: addr, tag: 'verify' })).toHaveLength(1)
  })

  it('rejects passwords under 10 characters', async () => {
    await expect(signUp(email(), 'short1234')).rejects.toThrow()
  })

  it('rejects breached passwords', async () => {
    await expect(signUp(email(), 'password123')).rejects.toThrow(/data breach/)
  })

  it('blocks sign-in until the email is verified', async () => {
    const addr = email()
    await signUp(addr)
    const before = await signIn(addr)
    expect(before.status).toBe(403)
    await verify(addr)
    const after = await signIn(addr)
    expect(after.status).toBe(200)
  })
})

describe('lockout', () => {
  it(`locks the account after ${LOCKOUT.maxFailures} failed sign-ins and emails the owner`, async () => {
    const addr = email()
    await signUp(addr)
    await verify(addr)
    for (let i = 0; i < LOCKOUT.maxFailures; i++) expect((await signIn(addr, 'wrong password here')).status).toBe(401)
    await expect(signIn(addr)).rejects.toMatchObject({ statusCode: 429, body: { code: 'ACCOUNT_LOCKED' } })
    expect(await readOutbox({ to: addr, tag: 'locked' })).toHaveLength(1)
  })

  it('resets the failure count after a successful sign-in', async () => {
    const addr = email()
    await signUp(addr)
    await verify(addr)
    await signIn(addr, 'wrong password here')
    expect((await signIn(addr)).status).toBe(200)
    const u = first(await getDb().select().from(schema.user).where(eq(schema.user.email, addr)))
    expect(u.failedLoginCount).toBe(0)
  })

  it('refuses suspended accounts', async () => {
    const addr = email()
    await signUp(addr)
    await verify(addr)
    await getDb().update(schema.user).set({ status: 'suspended' }).where(eq(schema.user.email, addr))
    await expect(signIn(addr)).rejects.toMatchObject({ statusCode: 403, body: { code: 'ACCOUNT_SUSPENDED' } })
  })
})

describe('password reset', () => {
  it('uses a single-use token that expires in 30 minutes and signs out other sessions', async () => {
    const addr = email()
    await signUp(addr)
    await verify(addr)
    const cookie = cookieOf(await signIn(addr))
    await getAuth().api.requestPasswordReset({ body: { email: addr, redirectTo: '/reset-password' } })
    const mail = first(await readOutbox({ to: addr, tag: 'reset' }))
    const token = tokenFrom(mail.text)
    const row = first(await getDb().select().from(schema.verification).where(eq(schema.verification.identifier, `reset-password:${token}`)))
    const minutes = (row.expiresAt.getTime() - Date.now()) / 60_000
    expect(minutes).toBeGreaterThan(29)
    expect(minutes).toBeLessThanOrEqual(30)

    await getAuth().api.resetPassword({ body: { token, newPassword: 'a whole new passphrase' } })
    await expect(getAuth().api.resetPassword({ body: { token, newPassword: 'another new passphrase' } })).rejects.toThrow()
    const stale = await getAuth().api.getSession({ headers: new Headers({ cookie }) })
    expect(stale).toBeNull()
    expect((await signIn(addr, 'a whole new passphrase')).status).toBe(200)
    expect(await readOutbox({ to: addr, tag: 'passwordChanged' })).toHaveLength(1)
  })

  it('rejects a breached new password', async () => {
    const addr = email()
    await signUp(addr)
    await verify(addr)
    await getAuth().api.requestPasswordReset({ body: { email: addr, redirectTo: '/reset-password' } })
    const mail = first(await readOutbox({ to: addr, tag: 'reset' }))
    await expect(getAuth().api.resetPassword({ body: { token: tokenFrom(mail.text), newPassword: 'qwertyuiop' } })).rejects.toThrow(/data breach/)
  })
})

describe('super-admin', () => {
  it('becomes Owner with unlimited credits only after verifying ADMIN_EMAIL', async () => {
    const res = await signUp('owner@example.test')
    let u = first(await getDb().select().from(schema.user).where(eq(schema.user.id, res.user.id)))
    expect(u.role).toBe('user')
    await verify('owner@example.test')
    u = first(await getDb().select().from(schema.user).where(eq(schema.user.id, res.user.id)))
    expect(u.role).toBe('owner')
    expect((await getBalance(u.defaultWorkspaceId!)).unlimited).toBe(true)
  })
})

describe('sessions', () => {
  it('lists sessions and signs out everywhere', async () => {
    const addr = email()
    await signUp(addr)
    await verify(addr)
    const a = cookieOf(await signIn(addr))
    await signIn(addr)
    const headers = new Headers({ cookie: a })
    const list = await getAuth().api.listSessions({ headers })
    expect(list.length).toBeGreaterThanOrEqual(2)
    await getAuth().api.revokeSessions({ headers })
    expect(await getAuth().api.getSession({ headers })).toBeNull()
  })
})
