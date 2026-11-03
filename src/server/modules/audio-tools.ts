import 'server-only'
import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import { getVoiceEngine, requireEngineFeature } from '@/server/engine'
import { getStorage } from '@/server/storage'
import { registerJobHandler } from '@/server/jobs'
import { wavToMp3 } from '@/server/audio'
import { failGeneration, finishGeneration, generationView, startGeneration, type Actor } from '@/server/generations'
import { chargeMediaJob, consumeUploads, queueMediaJob } from '@/server/media-jobs'
import { UserError } from '@/server/api/errors'
import { CREDIT_RATES } from '@/config/plans'
import { ENGINE_LIMITS } from '@/config/engine-limits'
import { getMessages } from '@/i18n'
import type { IsolatorInput, SfxInput, SttInput } from '@/lib/schemas/audio-tools'
import type { Segment } from '@/lib/transcript-format'

/* ------------------------------------------------------------------ Speech to Text */

const STT_MAX_MS = () => ENGINE_LIMITS.sttMaxHours.value * 3_600_000

export async function transcribe(actor: Actor, input: SttInput) {
  requireEngineFeature('transcribe')
  return queueMediaJob(actor, {
    type: 'stt', module: 'stt', uploadId: input.uploadId, perMinute: CREDIT_RATES.sttPerMinute, declaredMs: input.declaredMs, maxMs: STT_MAX_MS(),
    input: { language: input.language ?? null, speakers: input.speakers ?? null },
  })
}

registerJobHandler('stt', async (ctx) => {
  const { language, speakers, filename } = ctx.job.input as { language: string | null; speakers: number | null; filename: string }
  const { wav, durationMs, generation, upload } = await chargeMediaJob(ctx, {
    module: 'stt', perMinute: CREDIT_RATES.sttPerMinute, maxMs: STT_MAX_MS(), sampleRate: 16000, input: { language, speakers },
  })
  await ctx.progress(15, 'transcribing')
  const t = await getVoiceEngine().transcribe({ audio: wav, language: language ?? undefined, speakers: speakers ?? undefined })
  await ctx.checkCancelled()
  await ctx.progress(85, 'saving')
  // Keep a compressed copy of the source so the transcript can play along. It's the user's own audio, so no AI label.
  const key = `${generation.workspaceId}/gen/${generation.id}.mp3`
  await (await getStorage()).put(key, await wavToMp3(wav), 'audio/mpeg')
  await getDb().update(schema.generation).set({
    status: 'succeeded', outputKey: key, outputMime: 'audio/mpeg', durationMs,
    input: { ...generation.input, title: filename.replace(/\.[a-z0-9]+$/i, ''), language: t.language, segments: t.segments, speakerNames: {} },
  }).where(eq(schema.generation.id, generation.id))
  await consumeUploads([upload])
  return { generationId: generation.id, segments: t.segments.length }
})

export async function getTranscript(workspaceId: string, id: string) {
  const [g] = await getDb().select().from(schema.generation).where(and(eq(schema.generation.id, id), eq(schema.generation.workspaceId, workspaceId), eq(schema.generation.module, 'stt')))
  if (!g) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  return g
}

export async function transcriptView(g: typeof schema.generation.$inferSelect) {
  const base = await generationView(g)
  return {
    id: g.id, status: g.status, title: (g.input.title as string) ?? (g.input.filename as string) ?? '', language: (g.input.language as string) ?? null,
    durationMs: g.durationMs, credits: g.credits, createdAt: g.createdAt, audioUrl: base.audioUrl, error: g.error,
    segments: (g.input.segments ?? []) as Segment[], speakerNames: (g.input.speakerNames ?? {}) as Record<string, string>,
  }
}

export async function updateTranscript(workspaceId: string, id: string, patch: { title?: string; speakerNames?: Record<string, string> }) {
  const g = await getTranscript(workspaceId, id)
  const input = { ...g.input, ...(patch.title ? { title: patch.title } : {}), ...(patch.speakerNames ? { speakerNames: { ...(g.input.speakerNames as object), ...patch.speakerNames } } : {}) }
  const [row] = await getDb().update(schema.generation).set({ input }).where(eq(schema.generation.id, id)).returning()
  return row!
}

/* ------------------------------------------------------------------ Sound Effects */

/** One sound effect from a text prompt. Short, so it runs in the request. */
export async function soundEffect(actor: Actor, input: SfxInput) {
  const engine = requireEngineFeature('soundEffects')
  const g = await startGeneration(actor, {
    module: 'sfx', units: 1, credits: CREDIT_RATES.soundEffectPerGeneration,
    input: { text: input.prompt, seconds: input.seconds ?? null, promptInfluence: input.promptInfluence, format: input.format },
  })
  try {
    const audio = await engine.soundEffect({ prompt: input.prompt, seconds: input.seconds, promptInfluence: input.promptInfluence, seed: g.id })
    return generationView(await finishGeneration(g, audio, input.format))
  } catch (err) {
    await failGeneration(g, (err as Error).message)
    throw err
  }
}

/* ------------------------------------------------------------------ Voice Isolator */

const ISO_MAX_MS = () => ENGINE_LIMITS.isolatorMaxHours.value * 3_600_000

export async function isolate(actor: Actor, input: IsolatorInput) {
  requireEngineFeature('isolate')
  return queueMediaJob(actor, {
    type: 'isolator', module: 'isolator', uploadId: input.uploadId, perMinute: CREDIT_RATES.isolatorPerMinute, declaredMs: input.declaredMs, maxMs: ISO_MAX_MS(),
    input: { format: input.format },
  })
}

registerJobHandler('isolator', async (ctx) => {
  const { format, filename } = ctx.job.input as { format: 'mp3' | 'wav'; filename: string }
  const { wav, generation, upload } = await chargeMediaJob(ctx, { module: 'isolator', perMinute: CREDIT_RATES.isolatorPerMinute, maxMs: ISO_MAX_MS(), input: { format, text: filename } })
  await ctx.progress(20, 'isolating')
  const out = await getVoiceEngine().isolate({ audio: wav })
  await ctx.checkCancelled()
  // The isolated voice is the user's own recording, cleaned, not synthetic speech: no "AI-generated" label.
  const done = await finishGeneration(generation, out, format, { label: false })
  await consumeUploads([upload])
  return { generationId: done.id }
})
