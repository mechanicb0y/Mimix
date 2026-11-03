import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import type { Module } from '@/server/db/schema'
import { getBalance } from '@/server/credits'
import { createJob, type JobContext } from '@/server/jobs'
import { toWav, wavDurationMs } from '@/server/audio'
import { startGeneration, type Actor, type GenerationRow } from '@/server/generations'
import { takeUploads, consumeUploads, type UploadRow } from '@/server/uploads'
import { UserError, } from '@/server/api/errors'
import { InsufficientCreditsError } from '@/server/credits'
import { getMessages, fmt } from '@/i18n'

/**
 * Shared shape of the per-minute modules (Voice Changer, Voice Isolator, Speech to Text, Dubbing):
 *   request  → checks the upload exists, pre-checks credits from the duration the browser reports,
 *              and queues a job (202)
 *   job      → decodes the file with ffmpeg (worker), measures the real duration, enforces the
 *              length limit, charges per started minute, does the work, stores the result
 * Credits are charged from the measured duration, never the declared one, and refunded if the job fails.
 */
export function minutesOf(ms: number): number { return Math.max(1, Math.ceil(ms / 60_000)) }

export async function queueMediaJob(actor: Actor, opts: { type: string; module: Module; uploadId: string; perMinute: number; declaredMs?: number; maxMs: number; input: Record<string, unknown> }) {
  const [u] = await takeUploads(actor.workspaceId, [opts.uploadId], 'media')
  if (opts.declaredMs) {
    tooLong(opts.declaredMs, opts.maxMs)
    const needed = minutesOf(opts.declaredMs) * opts.perMinute
    const b = await getBalance(actor.workspaceId)
    if (!b.unlimited && b.total < needed) throw new InsufficientCreditsError(needed, b.total)
  }
  const job = await createJob({ workspaceId: actor.workspaceId, userId: actor.userId, type: opts.type, input: { ...opts.input, uploadId: u!.id, filename: u!.filename, apiKeyId: actor.apiKeyId } })
  return job
}

function tooLong(ms: number, maxMs: number) {
  if (ms > maxMs) {
    const max = maxMs >= 3_600_000 ? `${maxMs / 3_600_000} hours` : `${Math.round(maxMs / 60_000)} minutes`
    throw new UserError('too_long', fmt(getMessages('en').errors.app.mediaTooLong, { max }), 422, { uploadId: fmt(getMessages('en').errors.app.mediaTooLong, { max }) })
  }
}

/** Inside a job: decode the upload, enforce the limit and charge for the measured minutes. */
export async function chargeMediaJob(ctx: JobContext, opts: { module: Module; perMinute: number; maxMs: number; sampleRate?: number; voiceId?: string | null; input?: Record<string, unknown> }): Promise<{ wav: Uint8Array; durationMs: number; generation: GenerationRow; upload: UploadRow & { data: Uint8Array } }> {
  const j = ctx.job
  const { uploadId, apiKeyId, filename } = j.input as { uploadId: string; apiKeyId?: string | null; filename: string }
  const [u] = await takeUploads(j.workspaceId, [uploadId], 'media')
  await ctx.progress(3, 'decoding')
  const wav = await toWav(u!.data, opts.sampleRate ?? 22050)
  const durationMs = wavDurationMs(wav)
  tooLong(durationMs, opts.maxMs)
  const minutes = minutesOf(durationMs)
  const generation = await startGeneration({ workspaceId: j.workspaceId, userId: j.userId, apiKeyId: apiKeyId ?? null }, {
    module: opts.module, units: minutes, credits: minutes * opts.perMinute, voiceId: opts.voiceId ?? null,
    input: { ...opts.input, filename, sourceDurationMs: durationMs, jobId: j.id },
  })
  // Link the generation so a failed or cancelled job refunds it.
  await getDb().update(schema.job).set({ generationId: generation.id }).where(eq(schema.job.id, j.id))
  ctx.job.generationId = generation.id
  return { wav, durationMs, generation, upload: u! }
}

export { consumeUploads }
