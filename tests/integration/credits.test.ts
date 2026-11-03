import { first } from '../support/first'
import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import { newId } from '@/server/ids'
import { addCredits, chargeCredits, getBalance, InsufficientCreditsError, refundCredits, resetPlanCredits } from '@/server/credits'

async function workspace(plan = 1000, topUp = 0) {
  const id = newId('ws')
  await getDb().insert(schema.workspace).values({ id, name: 'Test', creditBalance: plan, topUpBalance: topUp })
  return id
}

describe('credits', () => {
  it('spends plan credits before top-ups and writes one ledger row per charge', async () => {
    const ws = await workspace(100, 50)
    const b = await chargeCredits({ workspaceId: ws, credits: 120, module: 'tts', refId: newId('gen') })
    expect(b).toMatchObject({ plan: 0, topUp: 30, total: 30 })
    const rows = await getDb().select().from(schema.creditLedger).where(eq(schema.creditLedger.workspaceId, ws))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ delta: -120, note: 'plan:100,top_up:20', balanceAfter: 30 })
  })

  it('is idempotent per generation', async () => {
    const ws = await workspace(100)
    const ref = newId('gen')
    await chargeCredits({ workspaceId: ws, credits: 40, module: 'tts', refId: ref })
    await chargeCredits({ workspaceId: ws, credits: 40, module: 'tts', refId: ref })
    expect((await getBalance(ws)).total).toBe(60)
  })

  it('refuses a charge larger than the balance and changes nothing', async () => {
    const ws = await workspace(10)
    await expect(chargeCredits({ workspaceId: ws, credits: 11, module: 'tts', refId: newId('gen') })).rejects.toBeInstanceOf(InsufficientCreditsError)
    expect((await getBalance(ws)).total).toBe(10)
  })

  it('never overspends under concurrent charges', async () => {
    const ws = await workspace(100)
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => chargeCredits({ workspaceId: ws, credits: 30, module: 'tts', refId: newId('gen') })))
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3)
    expect((await getBalance(ws)).total).toBe(10)
  })

  it('refunds once, into the plan bucket', async () => {
    const ws = await workspace(100)
    const ref = newId('gen')
    await chargeCredits({ workspaceId: ws, credits: 70, module: 'tts', refId: ref })
    await refundCredits({ workspaceId: ws, refId: ref })
    await refundCredits({ workspaceId: ws, refId: ref })
    expect((await getBalance(ws)).total).toBe(100)
  })

  it('meters unlimited workspaces without moving the balance', async () => {
    const ws = await workspace(0)
    await getDb().update(schema.workspace).set({ unlimited: true }).where(eq(schema.workspace.id, ws))
    await chargeCredits({ workspaceId: ws, credits: 5000, module: 'tts', refId: newId('gen') })
    const row = first(await getDb().select().from(schema.creditLedger).where(eq(schema.creditLedger.workspaceId, ws)))
    expect(row).toMatchObject({ delta: 0, note: 'unlimited:5000' })
  })

  it('monthly reset replaces plan credits and keeps top-ups', async () => {
    const ws = await workspace(5, 200)
    await resetPlanCredits({ workspaceId: ws, allowance: 40_000, reason: 'monthly_reset' })
    expect(await getBalance(ws)).toMatchObject({ plan: 40_000, topUp: 200 })
  })

  it('applies a top-up once per payment', async () => {
    const ws = await workspace(0)
    await addCredits({ workspaceId: ws, amount: 100_000, reason: 'top_up', refId: 'cs_test_1' })
    await addCredits({ workspaceId: ws, amount: 100_000, reason: 'top_up', refId: 'cs_test_1' })
    expect((await getBalance(ws)).topUp).toBe(100_000)
  })

  it('keeps the ledger append-only', async () => {
    const ws = await workspace(100)
    await chargeCredits({ workspaceId: ws, credits: 1, module: 'tts', refId: newId('gen') })
    await expect(getDb().update(schema.creditLedger).set({ delta: 0 }).where(eq(schema.creditLedger.workspaceId, ws))).rejects.toThrow()
  })
})
