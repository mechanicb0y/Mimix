import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import { newId } from '@/server/ids'
import { OWNER_PLAN, effectivePlan, getPlan, planHas } from '@/config/plans'
import { assertVoiceSlot, workspacePlan } from '@/server/modules/voices'
import { billingView } from '@/server/modules/account'
import { changeWorkspacePlan } from '@/server/admin/users'
import { resetDueCycles } from '@/server/billing'
import { getBalance } from '@/server/credits'
import type { AdminActor } from '@/server/admin/guard'
import { workspaceWithKey } from '../support/fixtures'

const voice = (workspaceId: string) => ({ id: newId('voc'), workspaceId, name: 'V', kind: 'designed' as const, status: 'active' as const, params: {} })

describe('the Owner has every feature and no quotas', () => {
  it('treats an unlimited workspace as the Owner plan, whatever its stored plan', async () => {
    expect(effectivePlan({ planId: 'free', unlimited: true })).toBe(OWNER_PLAN)
    expect(effectivePlan({ planId: 'free', unlimited: false }).id).toBe('free')
    for (const f of ['instantClone', 'dubbing', 'studio'] as const) expect(planHas(OWNER_PLAN, f)).toBe(true)
    expect(OWNER_PLAN).toMatchObject({ customVoices: null, seats: null, creditsPerMonth: null, mixerSources: 3, commercialUse: true })
  })

  it('lets the Owner keep making voices past a Free plan’s 3, and shows "Owner: all features"', async () => {
    const w = await workspaceWithKey({ plan: 'free' })
    await getDb().update(schema.workspace).set({ unlimited: true }).where(eq(schema.workspace.id, w.workspaceId))
    for (let i = 0; i < 4; i++) await getDb().insert(schema.voice).values(voice(w.workspaceId))
    await expect(assertVoiceSlot(w.workspaceId)).resolves.toBeUndefined()
    expect((await workspacePlan(w.workspaceId)).professionalClones).toBeGreaterThan(0)
    const b = await billingView(w.workspaceId)
    expect(b).toMatchObject({ owner: true, allowance: null, balance: { unlimited: true } })
    // The same workspace without the Owner flag is held to Free.
    await getDb().update(schema.workspace).set({ unlimited: false }).where(eq(schema.workspace.id, w.workspaceId))
    await expect(assertVoiceSlot(w.workspaceId)).rejects.toThrow(/3/)
  })
})

describe('staff give a workspace a plan free, without Stripe', () => {
  const actor: AdminActor = { id: 'usr_staff_test', email: 'staff@example.test', name: 'Staff', role: 'owner', sessionId: 's', ip: null }

  it('gives Pro until a date, resets its credits monthly, then returns it to Free', async () => {
    const w = await workspaceWithKey({ plan: 'free', credits: 0 })
    const until = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10)
    await changeWorkspacePlan(actor, w.userId, { workspaceId: w.workspaceId, planId: 'pro', reason: 'tester access', until })
    let [row] = await getDb().select().from(schema.workspace).where(eq(schema.workspace.id, w.workspaceId))
    expect(row).toMatchObject({ planId: 'pro', comped: true })
    expect(row!.compUntil!.toISOString().slice(0, 10)).toBe(until)
    expect((await getBalance(w.workspaceId)).plan).toBe(getPlan('pro').creditsPerMonth)
    expect(await billingView(w.workspaceId)).toMatchObject({ plan: 'pro', comped: true, owner: false })

    // A month on: no Stripe renewal, so the sweep resets the given plan's credits.
    await getDb().update(schema.workspace).set({ creditBalance: 5, cycleEndsAt: new Date(Date.now() - 1000) }).where(eq(schema.workspace.id, w.workspaceId))
    await resetDueCycles(new Date())
    expect((await getBalance(w.workspaceId)).plan).toBe(getPlan('pro').creditsPerMonth)

    // After the last day it returns to Free.
    await resetDueCycles(new Date(Date.now() + 41 * 86_400_000))
    ;[row] = await getDb().select().from(schema.workspace).where(eq(schema.workspace.id, w.workspaceId))
    expect(row).toMatchObject({ planId: 'free', comped: false, compUntil: null })
    expect((await getBalance(w.workspaceId)).plan).toBe(getPlan('free').creditsPerMonth)
  })

  it('refuses an end date in the past', async () => {
    const w = await workspaceWithKey({ plan: 'free' })
    await expect(changeWorkspacePlan(actor, w.userId, { workspaceId: w.workspaceId, planId: 'maker', reason: 'tester access', until: '2020-01-01' })).rejects.toThrow(/from today/)
  })
})
