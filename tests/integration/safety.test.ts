import { describe, expect, it, vi } from 'vitest'

/** The session cookie getSession() sees (public routes read it through next/headers). */
const jar = vi.hoisted(() => ({ cookie: '' }))
vi.mock('next/headers', () => ({ headers: async () => new Headers(jar.cookie ? { cookie: jar.cookie } : {}), cookies: async () => ({ get: () => undefined, set: () => {} }) }))

import { and, eq } from 'drizzle-orm'
import { POST as report } from '@/app/api/reports/route'
import { POST as provenance } from '@/app/api/provenance/route'
import { POST as save } from '@/app/api/v1/voices/mix/route'
import { POST as tts } from '@/app/api/v1/text-to-speech/route'
import { POST as createHook } from '@/app/api/v1/webhooks/route'
import { getDb, schema } from '@/server/db'
import { newId } from '@/server/ids'
import { readOutbox } from '@/server/email'
import { getStorage } from '@/server/storage'
import { resolveVoiceForUse } from '@/server/voices'
import { takeDownVoice } from '@/server/modules/safety'
import { call, workspaceWithKey } from '../support/fixtures'
import { signedIn } from '../support/session'

const params = { f0: 150, formantShift: 1, rate: 4.5, breathiness: 0.1, brightness: 0.5, expressiveness: 0.5 }
let ip = 0
/** Each call gets its own client address so the public rate limit doesn't interfere between tests. */
const from = () => ({ 'x-forwarded-for': `203.0.113.${++ip % 250}` })

async function ownVoice(workspaceId: string, userId: string, name = 'Sam') {
  const id = newId('voice')
  await getDb().insert(schema.voice).values({ id, workspaceId, ownerUserId: userId, name, kind: 'designed', status: 'active', licence: 'remix', params })
  return id
}

describe('reports', () => {
  it('validates, accepts anonymous reports and confirms by email', async () => {
    const w = await workspaceWithKey()
    const v = await ownVoice(w.workspaceId, w.userId)
    const bad = await call(report, { json: { targetType: 'voice', targetId: 'nope', reason: 'x' }, headers: from() })
    expect(bad.status).toBe(422)
    expect(Object.keys(bad.data.error.fields).sort()).toEqual(['reason', 'targetId'])
    const missing = await call(report, { json: { targetType: 'voice', targetId: 'voice_doesnotexist', reason: 'harmful' }, headers: from() })
    expect(missing.data.error.code).toBe('report_target')
    const ok = await call(report, { json: { targetType: 'voice', targetId: v, reason: 'harmful', details: 'Used in a scam call.', email: 'witness@example.test' }, headers: from() })
    expect(ok.status).toBe(201)
    const mail = (await readOutbox({ to: 'witness@example.test', tag: 'reportReceived' }))[0]!
    expect(mail.text).toContain(ok.data.id)
    // Honeypot: looks accepted, stores nothing.
    const bot = await call(report, { json: { targetType: 'voice', targetId: v, reason: 'other', website: 'http://spam' }, headers: from() })
    expect(bot.status).toBe(201)
    expect((await getDb().select().from(schema.abuseReport).where(eq(schema.abuseReport.targetId, v))).length).toBe(1)
  })

  it('pauses a voice after three people report missing consent', async () => {
    const w = await workspaceWithKey()
    const v = await ownVoice(w.workspaceId, w.userId, 'Paused Pat')
    for (const n of [1, 2]) await call(report, { json: { targetType: 'voice', targetId: v, reason: 'no_consent', email: `r${n}@example.test` }, headers: from() })
    // The same person twice doesn't count twice.
    await call(report, { json: { targetType: 'voice', targetId: v, reason: 'no_consent', email: 'r2@example.test' }, headers: from() })
    expect((await getDb().select({ s: schema.voice.status }).from(schema.voice).where(eq(schema.voice.id, v)))[0]!.s).toBe('active')
    // Anonymous reports without an email don't count towards the pause.
    await call(report, { json: { targetType: 'voice', targetId: v, reason: 'no_consent' }, headers: from() })
    expect((await getDb().select({ s: schema.voice.status }).from(schema.voice).where(eq(schema.voice.id, v)))[0]!.s).toBe('active')
    jar.cookie = (await signedIn()).cookie
    await call(report, { json: { targetType: 'voice', targetId: v, reason: 'no_consent' }, headers: from() })
    jar.cookie = ''
    expect((await getDb().select({ s: schema.voice.status }).from(schema.voice).where(eq(schema.voice.id, v)))[0]!.s).toBe('disabled')
    const [n] = await getDb().select().from(schema.notification).where(and(eq(schema.notification.userId, w.userId), eq(schema.notification.type, 'voice.disabled')))
    expect(n!.title).toContain('Paused Pat')
    await expect(resolveVoiceForUse(v, w.workspaceId)).rejects.toThrow()
  })
})

describe('takedown', () => {
  it('takes down a voice and every mix built from it, and tells the owners', async () => {
    const w = await workspaceWithKey({ plan: 'pro' })
    const source = await ownVoice(w.workspaceId, w.userId, 'Source Sue')
    const hook = await call(createHook, { json: { url: 'https://example.com/hook', events: ['voice.taken_down'] }, headers: { cookie: (await signedIn()).cookie } })
    expect(hook.status).toBe(201) // a different workspace's hook: it must not receive this workspace's event
    const mix = await call(save, { key: w.key, json: { sources: [{ voiceId: source, weight: 0.5 }, { voiceId: 'lib_wren', weight: 0.5 }], name: 'Sue mix', licence: 'private' } })
    expect(mix.status).toBe(201)
    const [lin] = await getDb().select().from(schema.voiceLineage).where(eq(schema.voiceLineage.sourceVoiceId, source))
    await getDb().insert(schema.webhook).values({ id: newId('wh'), workspaceId: w.workspaceId, url: 'https://example.com/w', events: ['voice.taken_down'], secretEnc: 'x' })
    await call(report, { json: { targetType: 'voice', targetId: source, reason: 'no_consent' }, headers: from() })

    const r = await takeDownVoice(source, { id: null, role: 'moderator' }, 'No consent from the speaker')
    expect(r.affected.sort()).toEqual([source, lin!.mixVoiceId].sort())
    const rows = await getDb().select({ id: schema.voice.id, s: schema.voice.status }).from(schema.voice).where(eq(schema.voice.workspaceId, w.workspaceId))
    expect(rows.every((x) => x.s === 'taken_down')).toBe(true)
    const deliveries = await getDb().select().from(schema.webhookDelivery).where(eq(schema.webhookDelivery.event, 'voice.taken_down'))
    const mine = deliveries.filter((d) => (d.payload as { workspaceId: string }).workspaceId === w.workspaceId)
    expect(mine.map((d) => (d.payload as { data: { voiceId: string } }).data.voiceId).sort()).toEqual(r.affected.sort())
    const [rep] = await getDb().select().from(schema.abuseReport).where(eq(schema.abuseReport.targetId, source))
    expect(rep!.status).toBe('actioned')
    const t = await call(tts, { key: w.key, json: { text: 'Hello', voiceId: lin!.mixVoiceId } })
    expect(t.status).toBeGreaterThanOrEqual(400)
  })
})

describe('provenance check', () => {
  it('recognises exact Mimix audio, labelled copies, and unknown audio', async () => {
    const w = await workspaceWithKey()
    const g = await call(tts, { key: w.key, json: { text: 'Provenance test sentence.', voiceId: 'lib_wren', format: 'mp3' } })
    expect(g.status).toBe(201)
    const [row] = await getDb().select().from(schema.generation).where(eq(schema.generation.id, g.data.id))
    const bytes = (await (await getStorage()).get(row!.outputKey!))!
    const exact = await call(provenance, { method: 'POST', headers: { ...from(), 'content-type': 'application/octet-stream' }, body: bytes })
    expect(exact.data).toMatchObject({ verdict: 'exact', reference: row!.id })
    const edited = new Uint8Array(bytes.length + 10); edited.set(bytes)
    expect((await call(provenance, { method: 'POST', headers: from(), body: edited })).data).toMatchObject({ verdict: 'labelled', reference: row!.id })
    const none = await call(provenance, { method: 'POST', headers: from(), body: new Uint8Array(2048).fill(7) })
    expect(none.data).toEqual({ verdict: 'none', createdAt: null, reference: null })
    expect((await call(provenance, { method: 'POST', headers: from() })).data.error.code).toBe('no_file')
  })
})
