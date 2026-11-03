/**
 * The background worker: `npm run worker`.
 *  - With QUEUE_DRIVER=bullmq it runs queued jobs (dubbing, transcripts, clones, Studio exports, data
 *    exports) from Redis, CONCURRENCY at a time (default 2).
 *  - Always: housekeeping every minute (webhook retries, stale uploads, monthly credit resets,
 *    expired exports, accounts past their deletion grace period).
 * `npm run worker -- --once` runs the housekeeping once and exits (for a cron job).
 */
import { env } from '@/server/env'
import { MAX_ATTEMPTS, runJob } from '@/server/jobs'
import { runSweeps } from '@/server/sweeps'

const once = process.argv.includes('--once')
const SWEEP_EVERY_MS = 60_000

async function sweep() {
  const r = await runSweeps()
  const busy = Object.entries(r).filter(([, n]) => n !== 0)
  if (busy.length) console.info('[worker] sweep', Object.fromEntries(busy))
}

async function main() {
  if (once) { await sweep(); process.exit(0) }
  const e = env()
  let worker: import('bullmq').Worker | undefined
  if (e.QUEUE_DRIVER === 'bullmq') {
    const { Worker } = await import('bullmq')
    const { default: IORedis } = await import('ioredis')
    const connection = new IORedis(e.REDIS_URL, { maxRetriesPerRequest: null })
    worker = new Worker('mimix-jobs', async (job) => {
      await runJob(String(job.data.jobId), { final: job.attemptsMade + 1 >= MAX_ATTEMPTS })
    }, { connection, concurrency: Number(process.env.CONCURRENCY ?? 2) })
    worker.on('failed', (job, err) => console.error('[worker] job failed', job?.data?.jobId, err.message))
    console.info('[worker] processing jobs from Redis')
  } else {
    console.info('[worker] QUEUE_DRIVER=inline: jobs run in the web process; this worker only does housekeeping')
  }
  await sweep()
  const timer = setInterval(() => { void sweep() }, SWEEP_EVERY_MS)
  const stop = async () => {
    clearInterval(timer)
    await worker?.close()
    process.exit(0)
  }
  process.on('SIGTERM', stop)
  process.on('SIGINT', stop)
}

main().catch((err) => { console.error('[worker] fatal', err); process.exit(1) })
