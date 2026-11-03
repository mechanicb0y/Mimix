import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { POST as preview } from '@/app/api/v1/voices/mix/preview/route'
import { POST as save } from '@/app/api/v1/voices/mix/route'
import { DELETE as deleteVoiceRoute, PATCH as patchVoice } from '@/app/api/v1/voices/[id]/route'
import { POST as tts } from '@/app/api/v1/text-to-speech/route'
import { getBalance } from '@/server/credits'
import { getDb, schema } from '@/server/db'
import { newId } from '@/server/ids'
import { CREDIT_RATES } from '@/config/plans'
import { call, workspaceWithKey } from '../support/fixtures'

const two = [{ voiceId: 'lib_wren', weight: 0.6 }, { voiceId: 'lib_atlas', weight: 0.4 }]

describe('Voice Mixer API', () => {
  it('previews a blend for free and returns WAV audio', async () => {
    const w = await workspaceWithKey({ credits: 50 })
    const r = await call(preview, { key: w.key, json: { sources: two, adjust: { pitch: 0.2, pace: 0, warmth: -0.3 } } })
    expect(r.status).toBe(200)
    expect(r.res.headers.get('content-type')).toBe('audio/wav')
    const bytes = new Uint8Array(await r.res.arrayBuffer())
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('RIFF')
    expect((await getBalance(w.workspaceId)).total).toBe(50)
  })

  it('validates sources, weights and adjustments', async () => {
    const w = await workspaceWithKey()
    const one = await call(preview, { key: w.key, json: { sources: [{ voiceId: 'lib_wren', weight: 1 }] } })
    expect(one.status).toBe(422)
    expect(one.data.error.fields.sources).toBe('Pick two or three voices.')
    const dup = await call(preview, { key: w.key, json: { sources: [{ voiceId: 'lib_wren', weight: 0.5 }, { voiceId: 'lib_wren', weight: 0.5 }] } })
    expect(dup.data.error.fields.sources).toBe('Pick different voices.')
    const sum = await call(preview, { key: w.key, json: { sources: [{ voiceId: 'lib_wren', weight: 0.5 }, { voiceId: 'lib_atlas', weight: 0.2 }] } })
    expect(sum.data.error.fields.sources).toBe('Weights must add up to 100%.')
    const adj = await call(preview, { key: w.key, json: { sources: two, adjust: { pitch: 3 } } })
    expect(adj.data.error.fields['adjust.pitch']).toMatch(/−100 to \+100/)
  })

  it('refuses voices that are not owned or remix-licensed', async () => {
    const w = await workspaceWithKey()
    const r = await call(preview, { key: w.key, json: { sources: [{ voiceId: 'lib_wren', weight: 0.5 }, { voiceId: 'lib_marlow', weight: 0.5 }] } })
    expect(r.status).toBe(403)
    expect(r.data.error.code).toBe('voice_not_mixable')
    expect(r.data.error.fields['sources.1.voiceId']).toMatch(/Marlow can’t be mixed/)
    // Another workspace's private voice is not even visible.
    const other = await workspaceWithKey()
    const theirs = newId('voice')
    await getDb().insert(schema.voice).values({ id: theirs, workspaceId: other.workspaceId, name: 'Theirs', kind: 'designed', status: 'active', licence: 'remix', params: { f0: 150, formantShift: 1, rate: 4.5, breathiness: 0.1, brightness: 0.5, expressiveness: 0.5 } })
    const hidden = await call(preview, { key: w.key, json: { sources: [{ voiceId: 'lib_wren', weight: 0.5 }, { voiceId: theirs, weight: 0.5 }] } })
    expect(hidden.status).toBe(404)
  })

  it('limits the Free plan to two sources', async () => {
    const w = await workspaceWithKey({ plan: 'free' })
    const r = await call(preview, { key: w.key, json: { sources: [{ voiceId: 'lib_wren', weight: 0.34 }, { voiceId: 'lib_atlas', weight: 0.33 }, { voiceId: 'lib_koa', weight: 0.33 }] } })
    expect(r.status).toBe(403)
    expect(r.data.error.code).toBe('mixer_source_limit')
    const pro = await workspaceWithKey({ plan: 'pro' })
    const ok = await call(preview, { key: pro.key, json: { sources: [{ voiceId: 'lib_wren', weight: 0.34 }, { voiceId: 'lib_atlas', weight: 0.33 }, { voiceId: 'lib_koa', weight: 0.33 }] } })
    expect(ok.status).toBe(200)
  })

  it('saves a mix with lineage, charges the save rate and inherits the most restrictive licence', async () => {
    const w = await workspaceWithKey({ credits: 5000 })
    const r = await call(save, { key: w.key, json: { sources: two, name: 'Wrenlas' } })
    expect(r.status).toBe(201)
    expect(r.data).toMatchObject({ name: 'Wrenlas', kind: 'mixed', licence: 'remix', owned: true, credits: CREDIT_RATES.mixerSave })
    expect(r.data.lineage.map((l: { id: string; weight: number }) => [l.id, l.weight])).toEqual([['lib_wren', 0.6], ['lib_atlas', 0.4]])
    expect((await getBalance(w.workspaceId)).total).toBe(5000 - CREDIT_RATES.mixerSave)

    // Mixing an owned private voice makes the mix private, and it can't be opened up.
    const mine = newId('voice')
    await getDb().insert(schema.voice).values({ id: mine, workspaceId: w.workspaceId, name: 'Mine', kind: 'designed', status: 'active', licence: 'private', params: { f0: 150, formantShift: 1, rate: 4.5, breathiness: 0.1, brightness: 0.5, expressiveness: 0.5 } })
    const priv = await call(save, { key: w.key, json: { sources: [{ voiceId: mine, weight: 0.5 }, { voiceId: 'lib_wren', weight: 0.5 }], name: 'Private mix' } })
    expect(priv.data.licence).toBe('private')
    const open = await call(save, { key: w.key, json: { sources: [{ voiceId: mine, weight: 0.5 }, { voiceId: 'lib_wren', weight: 0.5 }], name: 'Open mix', licence: 'remix' } })
    expect(open.status).toBe(422)
    expect(open.data.error.fields.licence).toMatch(/more open licence/)
    const patch = await call(patchVoice, { key: w.key, method: 'PATCH', json: { licence: 'standard' }, params: { id: priv.data.id } })
    expect(patch.status).toBe(422)
  })

  it('charges nothing when credits are short', async () => {
    const w = await workspaceWithKey({ credits: 10 })
    const r = await call(save, { key: w.key, json: { sources: two, name: 'Too poor' } })
    expect(r.status).toBe(402)
    expect(r.data.error).toMatchObject({ code: 'insufficient_credits', needed: CREDIT_RATES.mixerSave, available: 10 })
    const rows = await getDb().select().from(schema.voice).where(eq(schema.voice.workspaceId, w.workspaceId))
    expect(rows).toHaveLength(0)
  })

  it('refuses public-figure names and enforces the custom voice limit', async () => {
    await getDb().insert(schema.blockedVoice).values({ id: newId('blk'), name: 'Famous Person', aliases: ['F. Person'] }).onConflictDoNothing()
    const w = await workspaceWithKey()
    const blocked = await call(save, { key: w.key, json: { sources: two, name: 'famous person' } })
    expect(blocked.status).toBe(422)
    expect(blocked.data.error.code).toBe('blocked_name')

    const free = await workspaceWithKey({ plan: 'free' })
    for (let i = 0; i < 3; i++) expect((await call(save, { key: free.key, json: { sources: two, name: `Mix ${i}` } })).status).toBe(201)
    const full = await call(save, { key: free.key, json: { sources: two, name: 'One too many' } })
    expect(full.status).toBe(403)
    expect(full.data.error.code).toBe('voice_limit')
  })

  it('stops a mix working when a source is deleted', async () => {
    const w = await workspaceWithKey()
    const src = newId('voice')
    await getDb().insert(schema.voice).values({ id: src, workspaceId: w.workspaceId, name: 'Source', kind: 'designed', status: 'active', licence: 'remix', params: { f0: 150, formantShift: 1, rate: 4.5, breathiness: 0.1, brightness: 0.5, expressiveness: 0.5 } })
    const mix = await call(save, { key: w.key, json: { sources: [{ voiceId: src, weight: 0.5 }, { voiceId: 'lib_wren', weight: 0.5 }], name: 'Child' } })
    expect((await call(tts, { key: w.key, json: { text: 'Works now.', voiceId: mix.data.id } })).status).toBe(201)
    const del = await call(deleteVoiceRoute, { key: w.key, method: 'DELETE', params: { id: src } })
    expect(del.data.affectedMixes).toBe(1)
    const after = await call(tts, { key: w.key, json: { text: 'Fails now.', voiceId: mix.data.id } })
    expect(after.status).toBe(410)
    expect(after.data.error.code).toBe('voice_source_removed')
    // And it can't be remixed either.
    const remix = await call(preview, { key: w.key, json: { sources: [{ voiceId: mix.data.id, weight: 0.5 }, { voiceId: 'lib_atlas', weight: 0.5 }] } })
    expect(remix.status).toBe(410)
  })
})
