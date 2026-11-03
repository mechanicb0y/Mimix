import 'server-only'
import { getVoiceEngine, requireEngineFeature } from '@/server/engine'
import { registerJobHandler } from '@/server/jobs'
import { finishGeneration, type Actor } from '@/server/generations'
import { chargeMediaJob, consumeUploads, queueMediaJob } from '@/server/media-jobs'
import { paramsOf, resolveVoiceForUse } from '@/server/voices'
import { CREDIT_RATES } from '@/config/plans'
import { ENGINE_LIMITS } from '@/config/engine-limits'
import type { ChangerInput } from '@/lib/schemas/changer'

const MAX_MS = () => ENGINE_LIMITS.changerMaxMinutes.value * 60_000

/** Queues a Voice Changer job: keeps the delivery of the source recording, swaps in the chosen voice. */
export async function changeVoice(actor: Actor, input: ChangerInput) {
  requireEngineFeature('convert', ...(input.removeBackground ? ['isolate' as const] : []))
  await resolveVoiceForUse(input.voiceId, actor.workspaceId)
  return queueMediaJob(actor, {
    type: 'changer', module: 'changer', uploadId: input.uploadId, perMinute: CREDIT_RATES.changerPerMinute, declaredMs: input.declaredMs, maxMs: MAX_MS(),
    input: { voiceId: input.voiceId, format: input.format, removeBackground: input.removeBackground },
  })
}

registerJobHandler('changer', async (ctx) => {
  const { voiceId, format, removeBackground } = ctx.job.input as { voiceId: string; format: 'mp3' | 'wav'; removeBackground: boolean }
  const voice = await resolveVoiceForUse(voiceId, ctx.job.workspaceId)
  const { wav, generation, upload } = await chargeMediaJob(ctx, { module: 'changer', perMinute: CREDIT_RATES.changerPerMinute, maxMs: MAX_MS(), voiceId, input: { format, removeBackground } })
  const engine = getVoiceEngine()
  await ctx.progress(20, 'converting')
  const source = removeBackground ? (await engine.isolate({ audio: wav })).audio : wav
  await ctx.checkCancelled()
  const out = await engine.convert({ audio: source, target: paramsOf(voice), engineVoiceId: voice.engine === engine.id ? voice.engineVoiceId : null })
  await ctx.progress(85, 'saving')
  const done = await finishGeneration(generation, out, format)
  await consumeUploads([upload])
  return { generationId: done.id }
})
