import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GET as list, POST as create } from '@/app/api/v1/dubbing/route'
import { DELETE as del, GET as get, PATCH as patch } from '@/app/api/v1/dubbing/[id]/route'
import { POST as render } from '@/app/api/v1/dubbing/[id]/render/route'
import { GET as captions } from '@/app/api/v1/dubbing/[id]/captions/route'
import { GET as jobRoute } from '@/app/api/v1/jobs/[id]/route'
import { MockEngine } from '@/lib/voice/mock-engine'
import { LIBRARY_VOICES } from '@/config/voices'
import { CREDIT_RATES } from '@/config/plans'
import { getBalance } from '@/server/credits'
import { getDb, schema } from '@/server/db'
import { getStorage } from '@/server/storage'
import { drainInline } from '@/server/jobs'
import { eq } from 'drizzle-orm'
import { call, workspaceWithKey } from '../support/fixtures'
import { uploadFile } from '../support/uploads'

const engine = new MockEngine()
const talk = async () => (await engine.synthesize({ text: 'Welcome back to the kitchen. Today we bake bread. First the flour. Then the water.', voice: LIBRARY_VOICES[2]!.params, seed: 'dub' })).audio

async function startDub(w: Awaited<ReturnType<typeof workspaceWithKey>>, bytes: Uint8Array, filename = 'Kitchen.wav', extra: Record<string, unknown> = {}) {
  const up = await uploadFile(w.key, bytes, { purpose: 'media', filename })
  const r = await call(create, { key: w.key, json: { uploadId: up.id, targetLanguages: ['es', 'ms'], speakers: 2, ...extra } })
  expect(r.status).toBe(202)
  await drainInline()
  const job = await call(jobRoute, { key: w.key, params: { id: r.data.jobId } })
  return { id: r.data.project.id as string, job: job.data }
}

describe('Dubbing', () => {
  it('needs a Maker plan or above', async () => {
    const w = await workspaceWithKey({ plan: 'free' })
    const up = await uploadFile(w.key, await talk(), { purpose: 'media', filename: 'a.wav' })
    const r = await call(create, { key: w.key, json: { uploadId: up.id, targetLanguages: ['es'] } })
    expect(r.status).toBe(403)
    expect(r.data.error.message).toBe('Dubbing is included from the Maker plan up.')
  })

  it('validates languages', async () => {
    const w = await workspaceWithKey()
    const up = await uploadFile(w.key, await talk(), { purpose: 'media', filename: 'a.wav' })
    const same = await call(create, { key: w.key, json: { uploadId: up.id, sourceLanguage: 'en', targetLanguages: ['en'] } })
    expect(same.data.error.fields.targetLanguages).toBe('Pick a language different from the source.')
    const many = await call(create, { key: w.key, json: { uploadId: up.id, targetLanguages: ['es', 'fr', 'de', 'it', 'pt', 'nl'] } })
    expect(many.data.error.fields.targetLanguages).toBe('Pick up to 5 target languages per project.')
    const none = await call(create, { key: w.key, json: { uploadId: up.id, targetLanguages: [] } })
    expect(none.data.error.fields.targetLanguages).toBe('Pick at least one target language.')
  })

  it('transcribes, translates and voices every language, charging per minute per language', async () => {
    const w = await workspaceWithKey({ credits: 20_000 })
    const { id, job } = await startDub(w, await talk())
    expect(job.status).toBe('succeeded')
    expect((await getBalance(w.workspaceId)).total).toBe(20_000 - CREDIT_RATES.dubbingPerMinute * 2)

    const p = (await call(get, { key: w.key, params: { id } })).data
    expect(p).toMatchObject({ status: 'done', title: 'Kitchen', sourceLanguage: 'en', targetLanguages: ['es', 'ms'], isVideo: false, keepBackground: true })
    expect(Object.keys(p.cast)).toEqual(['Speaker 1', 'Speaker 2'])
    expect(p.cast['Speaker 1']).toMatch(/^lib_/)
    for (const lang of ['es', 'ms']) {
      expect(p.outputs[lang].status).toBe('done')
      expect(p.outputs[lang].audioUrl).toMatch(/\/api\/media\//)
      expect(p.outputs[lang].segments[0].text).toMatch(new RegExp(`^\\[${lang}\\] `))
      expect(p.outputs[lang].rerenderCredits).toBe(0)
    }
    const srt = await call(captions, { key: w.key, params: { id }, path: `/api/v1/dubbing/${id}/captions?language=es&format=srt` })
    expect(srt.res.headers.get('content-disposition')).toBe('attachment; filename="Kitchen-es.srt"')
    expect(await srt.res.text()).toMatch(/^1\n00:00:0\d,\d{3} --> .*\n\[es\] /)
    const items = await call(list, { key: w.key })
    expect(items.data.items[0]).toMatchObject({ id, status: 'done' })
  })

  it('re-renders only what changed, at the speech rate, and refuses a no-op render', async () => {
    const w = await workspaceWithKey({ credits: 20_000 })
    const { id } = await startDub(w, await talk())
    const before = (await getBalance(w.workspaceId)).total
    const p = (await call(get, { key: w.key, params: { id } })).data
    const lines = p.outputs.es.segments.map((s: { text: string }, i: number) => (i === 0 ? { ...s, text: 'Hola' } : s))
    const edited = await call(patch, { key: w.key, method: 'PATCH', params: { id }, json: { language: 'es', segments: lines } })
    expect(edited.data.outputs.es.rerenderCredits).toBe(4 * CREDIT_RATES.ttsPerCharacter)

    const r = await call(render, { key: w.key, params: { id }, json: { language: 'es' } })
    expect(r.status).toBe(202)
    await drainInline()
    expect((await getBalance(w.workspaceId)).total).toBe(before - 4)
    const again = await call(render, { key: w.key, params: { id }, json: { language: 'es' } })
    expect(again.status).toBe(409)

    const recast = await call(patch, { key: w.key, method: 'PATCH', params: { id }, json: { cast: { 'Speaker 2': 'lib_atlas' } } })
    const speaker2 = recast.data.outputs.ms.segments.filter((s: { speaker: string }) => s.speaker === 'Speaker 2').reduce((n: number, s: { text: string }) => n + s.text.length, 0)
    expect(recast.data.outputs.ms.rerenderCredits).toBe(p.cast['Speaker 2'] === 'lib_atlas' ? 0 : speaker2)
    const bad = await call(patch, { key: w.key, method: 'PATCH', params: { id }, json: { cast: { 'Speaker 9': 'lib_atlas' } } })
    expect(bad.status).toBe(422)
    const other = await workspaceWithKey()
    expect((await call(get, { key: other.key, params: { id } })).status).toBe(404)
  })

  it('dubs a video and returns an MP4 with the new audio track', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dubvid-'))
    writeFileSync(join(dir, 'a.wav'), await talk())
    const made = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=160x90:rate=10', '-i', join(dir, 'a.wav'), '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-y', join(dir, 'v.mp4')])
    expect(made.status).toBe(0)
    const w = await workspaceWithKey({ credits: 20_000 })
    const { id, job } = await startDub(w, new Uint8Array(readFileSync(join(dir, 'v.mp4'))), 'Clip.mp4', { targetLanguages: ['fr'] })
    expect(job.status).toBe('succeeded')
    const p = (await call(get, { key: w.key, params: { id } })).data
    expect(p.isVideo).toBe(true)
    expect(p.outputs.fr.videoUrl).toMatch(/\/api\/media\//)
    const [row] = await getDb().select().from(schema.dubbingProject).where(eq(schema.dubbingProject.id, id))
    const mp4 = await (await getStorage()).get(row!.outputs.fr!.videoKey!)
    expect(Buffer.from(mp4!.slice(4, 8)).toString()).toBe('ftyp')
    writeFileSync(join(dir, 'out.mp4'), mp4!)
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type:format_tags=comment', '-of', 'json', join(dir, 'out.mp4')]).stdout.toString()
    expect(probe).toMatch(/"video"/)
    expect(probe).toMatch(/"audio"/)
    expect(probe).toMatch(/AI-generated with Mimix/)

    expect((await call(del, { key: w.key, method: 'DELETE', params: { id } })).status).toBe(204)
    expect(await (await getStorage()).get(row!.outputs.fr!.videoKey!)).toBeNull()
    expect((await call(get, { key: w.key, params: { id } })).status).toBe(404)
  })
})
