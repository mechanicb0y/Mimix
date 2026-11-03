import { describe, expect, it, inject, vi } from 'vitest'

/** The active-workspace cookie, so a test can act in a workspace the person joined. */
const jar = vi.hoisted(() => ({ ws: undefined as string | undefined }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (n: string) => (n === 'mimix_ws' && jar.ws ? { value: jar.ws } : undefined), set: () => {} }) }))

import { eq } from 'drizzle-orm'
import { inflateRawSync } from 'node:zlib'
import { GET as team } from '@/app/api/v1/team/route'
import { POST as invite } from '@/app/api/v1/team/invites/route'
import { DELETE as revokeInvite } from '@/app/api/v1/team/invites/[id]/route'
import { POST as accept } from '@/app/api/v1/team/invites/accept/route'
import { DELETE as removeMember, PATCH as setRole } from '@/app/api/v1/team/members/[userId]/route'
import { POST as transfer } from '@/app/api/v1/team/transfer/route'
import { PATCH as renameWs } from '@/app/api/v1/workspace/route'
import { GET as prefs, PATCH as setPrefs } from '@/app/api/v1/account/notifications/route'
import { GET as exportsList, POST as startExport } from '@/app/api/v1/account/exports/route'
import { GET as download } from '@/app/api/v1/account/exports/[id]/download/route'
import { DELETE as keepAccount, GET as deletionGet, POST as deleteAccount } from '@/app/api/v1/account/deletion/route'
import { GET as billing } from '@/app/api/v1/billing/route'
import { POST as checkout } from '@/app/api/v1/billing/checkout/route'
import { POST as topUp } from '@/app/api/v1/billing/top-up/route'
import { POST as portal } from '@/app/api/v1/billing/portal/route'
import { GET as ledgerRoute } from '@/app/api/v1/credits/ledger/route'
import { getDb, schema } from '@/server/db'
import { readOutbox } from '@/server/email'
import { drainInline } from '@/server/jobs'
import { getStorage } from '@/server/storage'
import { buildExport, purgeDeletedAccounts } from '@/server/modules/account'
import { createKey } from '@/server/modules/developers'
import { call, workspaceWithKey } from '../support/fixtures'
import { signedIn } from '../support/session'

const hasStripeMock = !!inject('stripeApiBase')
const as = (s: { cookie: string }, ws?: string) => { jar.ws = ws; return { headers: { cookie: s.cookie } } }
const inviteToken = async (email: string) => (await readOutbox({ to: email, tag: 'invite' }))[0]!.text.match(/\/invite\/([\w-]+)/)![1]!

/** Reads one file out of a ZIP made by createZip (stored or deflated). */
function unzip(zip: Uint8Array, name: string): Buffer | null {
  const b = Buffer.from(zip)
  let o = 0
  while (b.readUInt32LE(o) === 0x04034b50) {
    const method = b.readUInt16LE(o + 8), size = b.readUInt32LE(o + 18), nameLen = b.readUInt16LE(o + 26), extra = b.readUInt16LE(o + 28)
    const n = b.subarray(o + 30, o + 30 + nameLen).toString('utf8')
    const data = b.subarray(o + 30 + nameLen + extra, o + 30 + nameLen + extra + size)
    if (n === name) return method === 8 ? inflateRawSync(data) : data
    o += 30 + nameLen + extra + size
  }
  return null
}

describe('team', () => {
  it('invites within the seat limit, accepts by matching email, changes roles, transfers and leaves', async () => {
    const owner = await signedIn({ plan: 'production', name: 'Olive Owner' })
    const bea = await signedIn({ name: 'Bea' })
    const cal = await signedIn({ name: 'Cal' })

    const bad = await call(invite, { json: { email: 'nope', role: 'boss' }, ...as(owner) })
    expect(bad.status).toBe(422)
    expect(bad.data.error.fields).toMatchObject({ email: expect.any(String), role: expect.any(String) })

    const inv = await call(invite, { json: { email: bea.email, role: 'member' }, ...as(owner) })
    expect(inv.status).toBe(201)
    // Production has 2 seats: the owner plus one open invite fills them.
    const full = await call(invite, { json: { email: cal.email, role: 'viewer' }, ...as(owner) })
    expect(full.status).toBe(409)
    expect(full.data.error.code).toBe('seats_full')

    const token = await inviteToken(bea.email)
    expect((await call(accept, { json: { token }, ...as(cal) })).status).toBe(403) // invite is for Bea
    const ok = await call(accept, { json: { token }, ...as(bea) })
    expect(ok.status).toBe(200)
    expect(ok.data.workspaceId).toBe(owner.workspaceId)
    expect((await call(accept, { json: { token }, ...as(bea) })).status).toBe(410) // used

    const t = await call(team, as(owner, owner.workspaceId))
    expect(t.data.seats).toBe(2)
    expect(t.data.members.map((m: { name: string; role: string }) => `${m.name}:${m.role}`)).toEqual(['Olive Owner:owner', 'Bea:member'])
    expect(t.data.invites).toEqual([])

    // A member can't manage people; the owner can make Bea an admin, then the owner.
    expect((await call(invite, { json: { email: cal.email, role: 'viewer' }, ...as(bea, owner.workspaceId) })).status).toBe(403)
    expect((await call(setRole, { method: 'PATCH', json: { role: 'admin' }, params: { userId: owner.userId }, ...as(bea, owner.workspaceId) })).status).toBe(403)
    expect((await call(setRole, { method: 'PATCH', json: { role: 'admin' }, params: { userId: bea.userId }, ...as(owner, owner.workspaceId) })).status).toBe(204)
    expect((await call(removeMember, { method: 'DELETE', params: { userId: owner.userId }, ...as(owner, owner.workspaceId) })).data.error.code).toBe('last_owner')
    expect((await call(transfer, { json: { userId: bea.userId }, ...as(owner, owner.workspaceId) })).status).toBe(204)
    expect((await call(renameWs, { method: 'PATCH', json: { name: 'Bea’s studio' }, ...as(bea, owner.workspaceId) })).status).toBe(204)
    // The former owner is now an admin and can leave.
    expect((await call(removeMember, { method: 'DELETE', params: { userId: owner.userId }, ...as(owner, owner.workspaceId) })).status).toBe(204)
    const after = await call(team, as(bea, owner.workspaceId))
    expect(after.data.workspace.name).toBe('Bea’s studio')
    expect(after.data.members.map((m: { role: string }) => m.role)).toEqual(['owner'])
  })

  it('a one-seat plan explains how to get more, and invites can be cancelled', async () => {
    const solo = await signedIn({ plan: 'pro' })
    const r = await call(invite, { json: { email: 'x@example.test', role: 'member' }, ...as(solo) })
    expect(r.status).toBe(409)
    expect(r.data.error.message).toMatch(/Production or Team/)
    const teamOwner = await signedIn({ plan: 'team' })
    const inv = await call(invite, { json: { email: 'y@example.test', role: 'viewer' }, ...as(teamOwner) })
    expect((await call(invite, { json: { email: 'y@example.test', role: 'viewer' }, ...as(teamOwner) })).data.error.code).toBe('already_invited')
    expect((await call(revokeInvite, { method: 'DELETE', params: { id: inv.data.id }, ...as(teamOwner) })).status).toBe(204)
    expect((await call(team, as(teamOwner))).data.invites).toEqual([])
  })

  it('refuses API keys on account routes', async () => {
    const { key } = await workspaceWithKey({ scopes: ['usage:read'] })
    const r = await call(team, { key })
    expect(r.status).toBe(403)
    expect(r.data.error.code).toBe('session_only')
    expect((await call(ledgerRoute, { key })).status).toBe(200)
  })
})

describe('notifications, billing and usage', () => {
  it('stores email preferences', async () => {
    const s = await signedIn()
    expect((await call(prefs, as(s))).data).toEqual({ jobEmails: true, billingEmails: true, productEmails: false, lowCreditEmails: true })
    const r = await call(setPrefs, { method: 'PATCH', json: { jobEmails: false }, ...as(s) })
    expect(r.data.jobEmails).toBe(false)
    expect((await call(prefs, as(s))).data.jobEmails).toBe(false)
  })

  it('shows the plan and ledger, and guards billing actions', async () => {
    const s = await signedIn({ credits: 10_000 })
    const b = await call(billing, as(s))
    expect(b.data).toMatchObject({ plan: 'free', subscribed: false, allowance: 10_000, invoices: [] })
    const l = await call(ledgerRoute, as(s))
    expect(l.data.items[0]).toMatchObject({ reason: 'plan_grant', delta: 10_000 })
    expect((await call(topUp, { json: { topUp: 'topup_50k' }, ...as(s) })).data.error.code).toBe('free_plan_top_up')
    expect((await call(portal, { method: 'POST', ...as(s) })).data.error.code).toBe('no_customer')
    expect((await call(checkout, { json: { plan: 'enterprise', period: 'monthly' }, ...as(s) })).status).toBe(422)
  })

  it.runIf(hasStripeMock)('starts Checkout for a new subscription', async () => {
    const s = await signedIn()
    const r = await call(checkout, { json: { plan: 'pro', period: 'annual' }, ...as(s) })
    expect(r.status).toBe(200)
    expect(r.data.url).toMatch(/^https?:\/\//)
  })
})

describe('data export and deletion', () => {
  it('exports a ZIP once a day and serves it by signed URL', async () => {
    const s = await signedIn({ name: 'Ex Porter' })
    const r = await call(startExport, { method: 'POST', ...as(s) })
    expect(r.status).toBe(202)
    expect((await call(startExport, { method: 'POST', ...as(s) })).status).toBe(429)
    await drainInline()
    const list = await call(exportsList, as(s))
    expect(list.data.items[0]).toMatchObject({ id: r.data.id, status: 'ready' })
    const d = await call(download, { params: { id: r.data.id }, ...as(s) })
    expect(d.status).toBe(302)
    const [row] = await getDb().select().from(schema.dataExport).where(eq(schema.dataExport.id, r.data.id))
    const zip = (await (await getStorage()).get(row!.storageKey!))!
    const account = JSON.parse(unzip(zip, 'account.json')!.toString('utf8'))
    expect(account).toMatchObject({ name: 'Ex Porter', email: s.email })
    expect(unzip(zip, `workspaces/${s.workspaceId}/credit-ledger.json`)).not.toBeNull()
    expect(unzip(zip, 'README.txt')!.toString()).toMatch(/Mimix data export/)
    expect((await readOutbox({ to: s.email, tag: 'exportReady' })).length).toBe(1)
    // Secrets never leave: key hashes and webhook secrets are stripped.
    await createKey(s.workspaceId, s.userId, { name: 'Server', scopes: ['tts'], rateLimitPerMinute: 60 })
    const keys = JSON.parse(unzip(await buildExport(s.userId), `workspaces/${s.workspaceId}/api-keys.json`)!.toString('utf8'))
    expect(keys[0]).toMatchObject({ name: 'Server', prefix: expect.any(String) })
    expect(keys[0].hash).toBeUndefined()
  })

  it('schedules deletion with a grace period, can be cancelled, then purges', async () => {
    const owner = await signedIn({ plan: 'production' })
    const mate = await signedIn()
    await call(invite, { json: { email: mate.email, role: 'member' }, ...as(owner) })
    await call(accept, { json: { token: await inviteToken(mate.email) }, ...as(mate) })

    expect((await call(deleteAccount, { json: { confirmEmail: 'wrong@example.test' }, ...as(owner) })).status).toBe(422)
    const blocked = await call(deleteAccount, { json: { confirmEmail: owner.email }, ...as(owner) })
    expect(blocked.data.error.code).toBe('owns_shared')
    expect((await call(deletionGet, as(owner))).data.blockers).toHaveLength(1)

    const solo = await signedIn()
    const ok = await call(deleteAccount, { json: { confirmEmail: solo.email.toUpperCase() }, ...as(solo) })
    expect(ok.status).toBe(200)
    expect((await readOutbox({ to: solo.email, tag: 'deletionScheduled' })).length).toBe(1)
    expect((await call(keepAccount, { method: 'DELETE', ...as(solo) })).status).toBe(204)
    expect((await call(deletionGet, as(solo))).data.requestedAt).toBeNull()

    await call(deleteAccount, { json: { confirmEmail: solo.email }, ...as(solo) })
    expect(await purgeDeletedAccounts(new Date(Date.now() + 29 * 86_400_000))).toBe(0)
    await purgeDeletedAccounts(new Date(Date.now() + 31 * 86_400_000))
    expect(await getDb().select().from(schema.user).where(eq(schema.user.id, solo.userId))).toEqual([])
    expect(await getDb().select().from(schema.workspace).where(eq(schema.workspace.id, solo.workspaceId))).toEqual([])
  })
})
