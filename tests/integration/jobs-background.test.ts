import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { POST as ttsAsync } from '@/app/api/v1/text-to-speech/async/route'
import { GET as listRoute } from '@/app/api/v1/jobs/route'
import { GET as jobRoute } from '@/app/api/v1/jobs/[id]/route'
import { GET as historyItem } from '@/app/api/v1/history/[id]/route'
import { getDb, schema } from '@/server/db'
import { createJob, drainInline, registerJobHandler, resumeInlineJobs } from '@/server/jobs'
import { getBalance } from '@/server/credits'
import { jobTarget } from '@/lib/job-target'
import { call, workspaceWithKey } from '../support/fixtures'

describe('long work keeps running on the server, apart from the page that started it', () => {
  it('runs a Speech take as a job: 202 at once, then the take is in history', async () => {
    const w = await workspaceWithKey({ credits: 5000 })
    const before = (await getBalance(w.workspaceId)).total
    const r = await call(ttsAsync, { key: w.key, json: { text: 'A take that keeps going when you change page.', voiceId: 'lib_wren', format: 'wav' } })
    expect(r.status).toBe(202)
    expect(r.data).toMatchObject({ type: 'tts', status: 'queued', title: 'A take that keeps going when you change page.' })
    await drainInline()
    const j = await call(jobRoute, { key: w.key, params: { id: r.data.id } })
    expect(j.data.status).toBe('succeeded')
    const g = await call(historyItem, { key: w.key, params: { id: j.data.output.generationId } })
    expect(g.status).toBe(200)
    expect((await getBalance(w.workspaceId)).total).toBe(before - 'A take that keeps going when you change page.'.length)
    expect(jobTarget(j.data)).toBe('/app/speech')
  })

  it('checks the voice and credits before queueing', async () => {
    const w = await workspaceWithKey({ credits: 3 })
    const r = await call(ttsAsync, { key: w.key, json: { text: 'Too long for three credits.', voiceId: 'lib_wren' } })
    expect(r.status).toBe(402)
    const v = await call(ttsAsync, { key: (await workspaceWithKey()).key, json: { text: 'Hello.', voiceId: 'nope' } })
    expect(v.status).toBe(404)
  })

  it('answers the request before the job finishes (QUEUE_DRIVER=inline)', async () => {
    let release!: () => void
    const gate = new Promise<void>((res) => { release = res })
    registerJobHandler('test_slow', async (ctx) => { await ctx.progress(15, 'working'); await gate; return { ok: true } })
    const w = await workspaceWithKey()
    const job = await createJob({ workspaceId: w.workspaceId, userId: w.userId, type: 'test_slow', input: { title: 'call.wav' } })
    // createJob has returned while the handler is still waiting.
    await new Promise((r) => setTimeout(r, 50))
    const live = await call(listRoute, { key: w.key, path: '/api/v1/jobs' })
    expect(live.data.items).toEqual([expect.objectContaining({ id: job.id, status: 'running', progress: 15, title: 'call' })])
    release()
    await drainInline()
    expect((await call(listRoute, { key: w.key, path: '/api/v1/jobs' })).data.items).toEqual([])
    // Still listed for a while after it finished, so the header can say it's done.
    const recent = await call(listRoute, { key: w.key, path: '/api/v1/jobs?recent=1' })
    expect(recent.data.items[0]).toMatchObject({ id: job.id, status: 'succeeded' })
  })

  it('filters by type and by project, for pages that pick their own job up again', async () => {
    let release!: () => void
    const gate = new Promise<void>((res) => { release = res })
    registerJobHandler('test_wait', async () => { await gate; return {} })
    const w = await workspaceWithKey()
    const a = await createJob({ workspaceId: w.workspaceId, userId: w.userId, type: 'test_wait', input: { projectId: 'prj_a' } })
    await createJob({ workspaceId: w.workspaceId, userId: w.userId, type: 'test_wait', input: { projectId: 'prj_b' } })
    const byRef = await call(listRoute, { key: w.key, path: '/api/v1/jobs?type=test_wait&ref=prj_a' })
    expect(byRef.data.items.map((j: { id: string }) => j.id)).toEqual([a.id])
    expect((await call(listRoute, { key: w.key, path: '/api/v1/jobs?type=stt' })).data.items).toEqual([])
    // Another workspace sees none of them.
    expect((await call(listRoute, { key: (await workspaceWithKey()).key, path: '/api/v1/jobs?type=test_wait' })).data.items).toEqual([])
    release()
    await drainInline()
  })

  it('starts unfinished jobs again after the web process restarts', async () => {
    registerJobHandler('test_resume', async () => ({ resumed: true }))
    const w = await workspaceWithKey()
    // A job the old process had claimed when it stopped.
    const [row] = await getDb().insert(schema.job).values({ id: `job_${Date.now()}`, workspaceId: w.workspaceId, userId: w.userId, type: 'test_resume', status: 'running', progress: 40, attempts: 1 }).returning()
    expect(await resumeInlineJobs()).toBeGreaterThanOrEqual(1)
    await drainInline()
    const [after] = await getDb().select().from(schema.job).where(eq(schema.job.id, row!.id))
    expect(after).toMatchObject({ status: 'succeeded', output: { resumed: true } })
  })
})
