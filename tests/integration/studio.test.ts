import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { GET as list, POST as create } from '@/app/api/v1/studio/projects/route'
import { DELETE as delProject, GET as get, PATCH as patchProject } from '@/app/api/v1/studio/projects/[id]/route'
import { POST as importText } from '@/app/api/v1/studio/projects/[id]/import/route'
import { POST as addChapter } from '@/app/api/v1/studio/projects/[id]/chapters/route'
import { POST as exportRoute } from '@/app/api/v1/studio/projects/[id]/export/route'
import { DELETE as delChapter, PATCH as patchChapter } from '@/app/api/v1/studio/chapters/[id]/route'
import { POST as addBlock } from '@/app/api/v1/studio/blocks/route'
import { PATCH as patchBlock } from '@/app/api/v1/studio/blocks/[id]/route'
import { POST as generate } from '@/app/api/v1/studio/blocks/[id]/generate/route'
import { POST as addRule } from '@/app/api/v1/pronunciation/route'
import { GET as jobRoute } from '@/app/api/v1/jobs/[id]/route'
import { getBalance } from '@/server/credits'
import { getDb, schema } from '@/server/db'
import { getStorage } from '@/server/storage'
import { drainInline } from '@/server/jobs'
import { call, workspaceWithKey } from '../support/fixtures'

const SCRIPT = '# The gate\n\nIt was late. The rain had stopped.\n\nWREN: Are you sure about this?\n\nATLAS: Not at all.\n\n# Morning\n\nThe sun came up over the hills.'

async function project(w: Awaited<ReturnType<typeof workspaceWithKey>>, kind: 'audiobook' | 'podcast' = 'audiobook') {
  const r = await call(create, { key: w.key, json: { title: 'The Gate', kind, defaultVoiceId: 'lib_wren' } })
  expect(r.status).toBe(201)
  return r.data
}

describe('Studio', () => {
  it('is a Pro feature', async () => {
    const w = await workspaceWithKey({ plan: 'free' })
    const r = await call(create, { key: w.key, json: { title: 'X', defaultVoiceId: 'lib_wren' } })
    expect(r.status).toBe(403)
    expect(r.data.error.message).toBe('Studio projects are included from the Pro plan up.')
  })

  it('imports a manuscript into chapters, blocks and speakers, and edits them', async () => {
    const w = await workspaceWithKey()
    const p = await project(w)
    expect(p.chapters).toHaveLength(1)
    const r = await call(importText, { key: w.key, params: { id: p.id }, json: { text: SCRIPT } })
    expect(r.data.chapters.map((c: { title: string }) => c.title)).toEqual(['The gate', 'Morning'])
    expect(r.data.chapters[0].blocks.map((b: { speaker: string | null }) => b.speaker)).toEqual([null, 'WREN', 'ATLAS'])
    expect(r.data.speakers).toEqual(['WREN', 'ATLAS'])
    expect(r.data.characters).toBe(SCRIPT.replace(/# .*\n\n/g, '').replace(/WREN: |ATLAS: /g, '').split(/\n\n/).join('').length)
    expect(r.data.chapters[0].blocks[0].status).toBe('stale')

    const cast = await call(patchProject, { key: w.key, method: 'PATCH', params: { id: p.id }, json: { cast: { WREN: 'lib_wren', ATLAS: 'lib_atlas' } } })
    expect(cast.data.chapters[0].blocks[2].effectiveVoiceId).toBe('lib_atlas')
    const ch = await call(addChapter, { key: w.key, params: { id: p.id }, json: { title: 'Epilogue' } })
    const epilogue = ch.data.chapters[2]
    const moved = await call(patchChapter, { key: w.key, method: 'PATCH', params: { id: epilogue.id }, json: { move: 'up' } })
    expect(moved.data.chapters.map((c: { title: string }) => c.title)).toEqual(['The gate', 'Epilogue', 'Morning'])
    const b = await call(addBlock, { key: w.key, json: { chapterId: epilogue.id, text: 'The end.' } })
    expect(b.status).toBe(201)
    const tooLong = await call(patchBlock, { key: w.key, method: 'PATCH', params: { id: b.data.id }, json: { text: 'x'.repeat(2001) } })
    expect(tooLong.data.error.fields.text).toBe('Use 2,000 characters or fewer in one block. Split it with Enter twice.')
    const afterDel = await call(delChapter, { key: w.key, method: 'DELETE', params: { id: epilogue.id } })
    expect(afterDel.data.chapters).toHaveLength(2)
    expect((await call(list, { key: w.key })).data.items[0]).toMatchObject({ id: p.id, chapters: 2 })
  })

  it('voices one block, charges its characters once, and re-voices only after a change', async () => {
    const w = await workspaceWithKey({ credits: 5000 })
    const p = await project(w)
    await call(addRule, { key: w.key, json: { term: 'Mimix', replacement: 'mim-ix', type: 'alias', caseSensitive: false } })
    const imported = await call(importText, { key: w.key, params: { id: p.id }, json: { text: 'Welcome to Mimix.' } })
    const blk = imported.data.chapters[0].blocks[0]
    const g = await call(generate, { key: w.key, params: { id: blk.id } })
    expect(g.data).toMatchObject({ status: 'ready', audioUrl: expect.stringMatching(/\/api\/media\//) })
    expect((await getBalance(w.workspaceId)).total).toBe(5000 - 17)
    await call(generate, { key: w.key, params: { id: blk.id } })
    expect((await getBalance(w.workspaceId)).total).toBe(5000 - 17)
    const edited = await call(patchBlock, { key: w.key, method: 'PATCH', params: { id: blk.id }, json: { text: 'Welcome back.' } })
    expect(edited.data.status).toBe('stale')
    const recast = await call(patchBlock, { key: w.key, method: 'PATCH', params: { id: blk.id }, json: { voiceId: 'lib_atlas' } })
    expect(recast.data.effectiveVoiceId).toBe('lib_atlas')
    const [gen] = await getDb().select().from(schema.generation).where(eq(schema.generation.module, 'studio'))
    expect(gen).toBeTruthy()
  })

  it('exports one loudness-normalised MP3 per chapter, voicing only stale blocks', async () => {
    const w = await workspaceWithKey({ credits: 10_000 })
    const p = await project(w)
    const imported = await call(importText, { key: w.key, params: { id: p.id }, json: { text: SCRIPT } })
    const total = imported.data.characters
    await call(generate, { key: w.key, params: { id: imported.data.chapters[1].blocks[0].id } })
    const first = imported.data.chapters[1].blocks[0].text.length
    const r = await call(exportRoute, { key: w.key, params: { id: p.id }, json: {} })
    expect(r.status).toBe(202)
    await drainInline()
    const job = await call(jobRoute, { key: w.key, params: { id: r.data.id } })
    expect(job.data.status).toBe('succeeded')
    expect(job.data.output.generationIds).toHaveLength(2)
    expect(job.data.output.voicedBlocks).toBe(3)
    expect((await getBalance(w.workspaceId)).total).toBe(10_000 - total)
    expect(total).toBeGreaterThan(first)

    const v = (await call(get, { key: w.key, params: { id: p.id } })).data
    expect(v.staleCharacters).toBe(0)
    expect(v.chapters[0].export.downloadUrl).toMatch(/The-Gate-The-gate\.mp3/)
    const [g] = await getDb().select().from(schema.generation).where(eq(schema.generation.id, v.chapters[0].export.generationId))
    const mp3 = await (await getStorage()).get(g!.outputKey!)
    const dir = mkdtempSync(join(tmpdir(), 'stu-'))
    writeFileSync(join(dir, 'c.mp3'), mp3!)
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=bit_rate,sample_rate:format_tags=comment', '-of', 'json', join(dir, 'c.mp3')]).stdout.toString()
    expect(probe).toMatch(/"sample_rate": "44100"/)
    expect(probe).toMatch(/"bit_rate": "192000"/)

    const again = await call(exportRoute, { key: w.key, params: { id: p.id }, json: { chapterId: v.chapters[1].id } })
    await drainInline()
    const j2 = await call(jobRoute, { key: w.key, params: { id: again.data.id } })
    expect(j2.data.output).toMatchObject({ voicedBlocks: 0 })
    expect((await getBalance(w.workspaceId)).total).toBe(10_000 - total)
  })

  it('exports a podcast as one file and checks credits before queueing', async () => {
    const poor = await workspaceWithKey({ credits: 10 })
    const p = await project(poor, 'podcast')
    await call(importText, { key: poor.key, params: { id: p.id }, json: { text: SCRIPT } })
    const r = await call(exportRoute, { key: poor.key, params: { id: p.id }, json: {} })
    expect(r.status).toBe(402)

    const w = await workspaceWithKey({ credits: 10_000 })
    const q = await project(w, 'podcast')
    await call(importText, { key: w.key, params: { id: q.id }, json: { text: SCRIPT } })
    const e = await call(exportRoute, { key: w.key, params: { id: q.id }, json: {} })
    await drainInline()
    const job = await call(jobRoute, { key: w.key, params: { id: e.data.id } })
    expect(job.data.output.generationIds).toHaveLength(1)
    const v = (await call(get, { key: w.key, params: { id: q.id } })).data
    expect(v.fullExport.downloadUrl).toMatch(/The-Gate\.mp3/)
    expect((await call(delProject, { key: w.key, method: 'DELETE', params: { id: q.id } })).status).toBe(204)
  })
})
