import { describe, expect, it } from 'vitest'
import { GET as library } from '@/app/api/v1/library/route'
import { GET as myVoices } from '@/app/api/v1/voices/route'
import { GET as getVoice, PATCH as patchVoice } from '@/app/api/v1/voices/[id]/route'
import { POST as saveVoice, DELETE as unsaveVoice } from '@/app/api/v1/voices/[id]/save/route'
import { POST as publish, DELETE as unpublishRoute } from '@/app/api/v1/voices/[id]/publish/route'
import { POST as mix } from '@/app/api/v1/voices/mix/route'
import { GET as preview } from '@/app/api/v1/voices/[id]/preview/route'
import { moderatePublish } from '@/server/modules/voices'
import { call, workspaceWithKey } from '../support/fixtures'

async function aMix(w: { key: string }, name = 'Blend One') {
  return (await call(mix, { key: w.key, json: { sources: [{ voiceId: 'lib_wren', weight: 0.5 }, { voiceId: 'lib_atlas', weight: 0.5 }], name } })).data
}

describe('Voice library and My voices', () => {
  it('searches and filters the library, with facets', async () => {
    const w = await workspaceWithKey()
    const all = await call(library, { key: w.key, path: '/api/v1/library?facets=1' })
    expect(all.data.items.length).toBeGreaterThanOrEqual(12)
    expect(all.data.facets.languages).toEqual(expect.arrayContaining(['en', 'ms', 'ar']))
    const ms = await call(library, { key: w.key, path: '/api/v1/library?language=ms' })
    expect(ms.data.items.map((v: { name: string }) => v.name)).toEqual(['Aisyah'])
    const remix = await call(library, { key: w.key, path: '/api/v1/library?licence=standard' })
    expect(remix.data.items.every((v: { licence: string }) => v.licence === 'standard')).toBe(true)
    const q = await call(library, { key: w.key, path: '/api/v1/library?q=scott' })
    expect(q.data.items.map((v: { name: string }) => v.name)).toContain('Marlow')
  })

  it('saves and unsaves library voices', async () => {
    const w = await workspaceWithKey()
    expect((await call(saveVoice, { key: w.key, method: 'POST', params: { id: 'lib_noor' } })).status).toBe(204)
    const mine = await call(myVoices, { key: w.key })
    expect(mine.data.saved.map((v: { id: string }) => v.id)).toContain('lib_noor')
    await call(unsaveVoice, { key: w.key, method: 'DELETE', params: { id: 'lib_noor' } })
    expect((await call(myVoices, { key: w.key })).data.saved).toHaveLength(0)
  })

  it('shows lineage on a mix and serves a cached preview', async () => {
    const w = await workspaceWithKey()
    const m = await aMix(w)
    const d = await call(getVoice, { key: w.key, params: { id: m.id } })
    expect(d.data.lineage.map((l: { name: string }) => l.name).sort()).toEqual(['Atlas', 'Wren'])
    const p = await call(preview, { key: w.key, params: { id: m.id } })
    expect(p.status).toBe(200)
    expect(p.res.headers.get('content-type')).toMatch(/audio/)
  })

  it('publishes through moderation: private refused, pending hidden, approved listed, unpublish removes', async () => {
    const owner = await workspaceWithKey()
    const other = await workspaceWithKey()
    const m = await aMix(owner, 'Community Blend')
    const refused = await call(publish, { key: owner.key, method: 'POST', params: { id: m.id } })
    expect(refused.status).toBe(422)
    expect(refused.data.error.code).toBe('publish_description')
    await call(patchVoice, { key: owner.key, method: 'PATCH', params: { id: m.id }, json: { description: 'A friendly, balanced voice for explainers and tutorials.' } })
    const ok = await call(publish, { key: owner.key, method: 'POST', params: { id: m.id } })
    expect(ok.status).toBe(202)
    expect(ok.data.publishStatus).toBe('pending')
    const before = await call(library, { key: other.key, path: '/api/v1/library?q=Community' })
    expect(before.data.items).toHaveLength(0)
    await moderatePublish(m.id, 'approved', null, owner.userId)
    const after = await call(library, { key: other.key, path: '/api/v1/library?q=Community' })
    expect(after.data.items.map((v: { id: string }) => v.id)).toEqual([m.id])
    await call(saveVoice, { key: other.key, method: 'POST', params: { id: m.id } })
    await call(unpublishRoute, { key: owner.key, method: 'DELETE', params: { id: m.id } })
    expect((await call(library, { key: other.key, path: '/api/v1/library?q=Community' })).data.items).toHaveLength(0)
    expect((await call(myVoices, { key: other.key })).data.saved).toHaveLength(0)
  })

  it('refuses publishing a private voice and on the Free plan', async () => {
    const w = await workspaceWithKey()
    const m = await aMix(w, 'Private one')
    await call(patchVoice, { key: w.key, method: 'PATCH', params: { id: m.id }, json: { licence: 'private', description: 'A friendly, balanced voice for explainers and tutorials.' } })
    expect((await call(publish, { key: w.key, method: 'POST', params: { id: m.id } })).data.error.code).toBe('publish_private')
    const free = await workspaceWithKey({ plan: 'free' })
    const fm = await aMix(free, 'Free blend')
    await call(patchVoice, { key: free.key, method: 'PATCH', params: { id: fm.id }, json: { description: 'A friendly, balanced voice for explainers and tutorials.' } })
    expect((await call(publish, { key: free.key, method: 'POST', params: { id: fm.id } })).data.error.code).toBe('publish_plan')
  })
})
