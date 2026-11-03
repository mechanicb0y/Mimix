import 'server-only'
import { and, desc, eq, gte, inArray, or, sql } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import { env } from '@/server/env'
import { newId } from '@/server/ids'
import { refundCredits } from '@/server/credits'
import { notifyJobFinished } from '@/server/notifications'
import { getMessages, fmt } from '@/i18n'

/**
 * Long jobs (dubbing, transcription, cloning, Studio exports, isolation, voice changing).
 * The job row is the source of truth; progress is written to it and the browser follows it over
 * Server-Sent Events (/api/jobs/:id/events), so any server instance can serve the stream.
 *
 *   QUEUE_DRIVER=inline  runs the job in the web process right after the request (development, tests)
 *   QUEUE_DRIVER=bullmq  pushes it to Redis; `npm run worker` (a container with ffmpeg) runs it
 *
 * Credits are charged when the job is created and refunded automatically if it fails.
 */
export type JobRow = typeof schema.job.$inferSelect

export interface JobContext {
  job: JobRow
  progress(percent: number, message?: string): Promise<void>
  /** Throws if the job was cancelled, so long loops stop early. */
  checkCancelled(): Promise<void>
}

export type JobHandler = (ctx: JobContext) => Promise<Record<string, unknown>>

const handlers = new Map<string, JobHandler>()
export function registerJobHandler(type: string, handler: JobHandler) { handlers.set(type, handler) }

export class JobCancelledError extends Error { constructor() { super('Cancelled'); this.name = 'JobCancelledError' } }

export const MAX_ATTEMPTS = 3

export async function createJob(opts: { workspaceId: string; userId: string | null; type: string; input: Record<string, unknown>; generationId?: string | null }): Promise<JobRow> {
  const [row] = await getDb().insert(schema.job).values({
    id: newId('job'), workspaceId: opts.workspaceId, userId: opts.userId, type: opts.type, input: opts.input, generationId: opts.generationId ?? null,
  }).returning()
  await dispatch(row!.id)
  return row!
}

/* ------------------------------------------------------------------ drivers */

const inflight = new Set<Promise<void>>()

/** Runs work after the current request without awaiting it; drainInline() waits for it in tests. */
export function background(fn: () => Promise<unknown>): void {
  const p: Promise<void> = fn().then(() => {}, (e) => console.error('[background]', e)).finally(() => inflight.delete(p))
  inflight.add(p)
}

/** Waits for inline jobs started so far (tests, and graceful shutdown in development). */
export async function drainInline(): Promise<void> {
  while (inflight.size) await Promise.allSettled([...inflight])
}

let queue: import('bullmq').Queue | undefined
async function bullQueue() {
  if (!queue) {
    const { Queue } = await import('bullmq')
    const { default: IORedis } = await import('ioredis')
    queue = new Queue('mimix-jobs', { connection: new IORedis(env().REDIS_URL, { maxRetriesPerRequest: null }) })
  }
  return queue
}

async function dispatch(jobId: string) {
  if (env().QUEUE_DRIVER === 'bullmq') {
    await (await bullQueue()).add('run', { jobId }, { jobId, attempts: MAX_ATTEMPTS, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: 1000, removeOnFail: 5000 })
    return
  }
  const p = runJob(jobId).catch(() => {}).finally(() => inflight.delete(p))
  inflight.add(p)
}

/* ------------------------------------------------------------------ running */

async function load(jobId: string) {
  const [j] = await getDb().select().from(schema.job).where(eq(schema.job.id, jobId))
  return j ?? null
}

/** Runs one job. Used by the inline driver and by the worker. `final` = no retries left after this. */
export async function runJob(jobId: string, opts: { final?: boolean } = { final: true }): Promise<void> {
  const db = getDb()
  const claimed = await db.update(schema.job).set({ status: 'running', startedAt: new Date(), attempts: sql`${schema.job.attempts} + 1` })
    .where(and(eq(schema.job.id, jobId), inArray(schema.job.status, ['queued', 'running']))).returning()
  const job = claimed[0]
  if (!job) return // cancelled or already finished
  await import('./handlers')
  const handler = handlers.get(job.type)
  const ctx: JobContext = {
    job,
    async progress(percent, message) {
      await db.update(schema.job).set({ progress: Math.max(0, Math.min(99, Math.round(percent))), message: message ?? null }).where(eq(schema.job.id, jobId))
    },
    async checkCancelled() {
      const j = await load(jobId)
      if (!j || j.status === 'canceled') throw new JobCancelledError()
    },
  }
  try {
    if (!handler) throw new Error(`No handler for job type ${job.type}`)
    if (job.generationId) await db.update(schema.generation).set({ status: 'running' }).where(eq(schema.generation.id, job.generationId))
    const output = await handler(ctx)
    await db.update(schema.job).set({ status: 'succeeded', progress: 100, output, message: null, finishedAt: new Date() }).where(and(eq(schema.job.id, jobId), eq(schema.job.status, 'running')))
    if (job.generationId) await db.update(schema.generation).set({ status: 'succeeded' }).where(eq(schema.generation.id, job.generationId))
    await notifyJobFinished(job, true)
    await emitJobEvent(jobId, 'job.succeeded')
  } catch (err) {
    if (err instanceof JobCancelledError) { await settleFailure(job, 'canceled', 'Cancelled'); return }
    const retryable = (err as { retryable?: boolean }).retryable === true
    if (retryable && !opts.final) {
      await db.update(schema.job).set({ status: 'queued', message: 'Retrying…' }).where(eq(schema.job.id, jobId))
      throw err
    }
    console.error('[job]', job.type, jobId, err)
    await settleFailure(job, 'failed', userMessage(err))
  }
}

function userMessage(err: unknown): string {
  const e = err as { name?: string; message?: string }
  // Engine and validation errors carry user-safe text; anything else gets a generic line.
  if (e?.name === 'EngineError' || e?.name === 'AudioError' || e?.name === 'UserError') return e.message ?? 'Failed'
  if (e?.name === 'InsufficientCreditsError') {
    const c = err as { needed: number; available: number }
    return fmt(getMessages('en').errors.app.insufficientCredits, { needed: c.needed.toLocaleString('en-US'), available: c.available.toLocaleString('en-US') })
  }
  return 'Something went wrong while processing. No credits were charged.'
}

async function settleFailure(job: JobRow, status: 'failed' | 'canceled', error: string) {
  const db = getDb()
  await db.update(schema.job).set({ status, error, finishedAt: new Date() }).where(eq(schema.job.id, job.id))
  if (job.generationId) {
    await db.update(schema.generation).set({ status, error }).where(eq(schema.generation.id, job.generationId))
    await refundCredits({ workspaceId: job.workspaceId, refId: job.generationId, actorId: job.userId })
  }
  if (status === 'failed') {
    await notifyJobFinished(job, false, error)
    await emitJobEvent(job.id, 'job.failed')
  }
}

/** Webhook for a finished job, with the same fields GET /api/v1/jobs/{id} returns. Never fails the job. */
async function emitJobEvent(jobId: string, event: 'job.succeeded' | 'job.failed') {
  try {
    const j = await load(jobId)
    if (!j) return
    const { emitEvent } = await import('@/server/modules/developers')
    await emitEvent(j.workspaceId, event, { job: publicJob(j) })
  } catch (e) { console.error('[webhook] emit failed', e) }
}

export async function cancelJob(jobId: string, workspaceId: string): Promise<boolean> {
  const db = getDb()
  const [j] = await db.update(schema.job).set({ status: 'canceled', finishedAt: new Date(), error: 'Cancelled' })
    .where(and(eq(schema.job.id, jobId), eq(schema.job.workspaceId, workspaceId), eq(schema.job.status, 'queued'))).returning()
  if (j) { await settleFailure(j, 'canceled', 'Cancelled'); return true }
  // A running job is flagged; its handler stops at the next checkCancelled().
  const [r] = await db.update(schema.job).set({ status: 'canceled' })
    .where(and(eq(schema.job.id, jobId), eq(schema.job.workspaceId, workspaceId), eq(schema.job.status, 'running'))).returning()
  if (r) { await settleFailure(r, 'canceled', 'Cancelled'); return true }
  return false
}

export async function getJob(jobId: string, workspaceId: string) {
  const [j] = await getDb().select().from(schema.job).where(and(eq(schema.job.id, jobId), eq(schema.job.workspaceId, workspaceId)))
  return j ?? null
}

/** The fields a browser may see. */
export function publicJob(j: JobRow) {
  const named = [j.input.title, j.input.filename].find((x) => typeof x === 'string' && x) as string | undefined
  const ref = [j.input.projectId, j.input.voiceId].find((x) => typeof x === 'string' && x) as string | undefined
  return {
    id: j.id, type: j.type, status: j.status, progress: j.progress, message: j.message, output: j.status === 'succeeded' ? j.output : null, error: j.error,
    /** A short name for lists: the file, project or script it works on. */
    title: named ? named.replace(/\.[a-z0-9]{2,4}$/i, '').slice(0, 80) : null,
    /** The project or voice it belongs to, so a page can pick its own jobs up again. */
    ref: ref ?? null,
    createdAt: j.createdAt, finishedAt: j.finishedAt,
  }
}

export const ACTIVE_JOB_STATUSES = ['queued', 'running'] as const

/**
 * The workspace's jobs, newest first: the ones still running, plus (with recentMs) the ones that
 * finished in that window, so the header can say when each one is done.
 */
export async function listJobs(workspaceId: string, opts: { recentMs?: number; types?: string[]; ref?: string; limit?: number } = {}) {
  const live = inArray(schema.job.status, [...ACTIVE_JOB_STATUSES])
  const when = opts.recentMs ? or(live, gte(schema.job.finishedAt, new Date(Date.now() - opts.recentMs)))! : live
  const rows = await getDb().select().from(schema.job).where(and(
    eq(schema.job.workspaceId, workspaceId), when,
    opts.types?.length ? inArray(schema.job.type, opts.types) : undefined,
    opts.ref ? sql`coalesce(${schema.job.input}->>'projectId', ${schema.job.input}->>'voiceId') = ${opts.ref}` : undefined,
  )).orderBy(desc(schema.job.createdAt)).limit(Math.min(50, opts.limit ?? 20))
  return rows.map(publicJob)
}

/**
 * QUEUE_DRIVER=inline runs jobs in the web process, detached from the request that queued them.
 * If that process stopped (Stop Mimix, a crash, an update), its unfinished jobs start again when
 * it comes back. Called once at server start (instrumentation.ts).
 */
export async function resumeInlineJobs(): Promise<number> {
  if (env().QUEUE_DRIVER !== 'inline') return 0
  const db = getDb()
  const stale = await db.select({ id: schema.job.id, attempts: schema.job.attempts }).from(schema.job).where(inArray(schema.job.status, [...ACTIVE_JOB_STATUSES]))
  for (const j of stale) {
    if (j.attempts >= MAX_ATTEMPTS) {
      const [row] = await db.select().from(schema.job).where(eq(schema.job.id, j.id))
      if (row) await settleFailure(row, 'failed', 'Mimix stopped while this was running, several times. Try again.')
      continue
    }
    await db.update(schema.job).set({ status: 'queued', message: null }).where(eq(schema.job.id, j.id))
    await dispatch(j.id)
  }
  return stale.length
}
