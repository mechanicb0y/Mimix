import 'server-only'
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import type { Module } from '@/server/db/schema'
import { newId } from '@/server/ids'
import { chargeCredits, refundCredits } from '@/server/credits'
import { getStorage } from '@/server/storage'
import { wavToMp3 } from '@/server/audio'
import { fingerprint, tagMp3, tagWav } from '@/server/provenance'
import { UserError } from '@/server/api/errors'
import { getPlan } from '@/config/plans'
import { requireModuleFlag } from '@/server/flags'
import type { AudioFormat, AudioResult } from '@/lib/voice/types'

export type GenerationRow = typeof schema.generation.$inferSelect

export interface Actor { workspaceId: string; userId: string | null; apiKeyId: string | null }

/** Enforces an API key's optional monthly credit cap. */
async function checkKeyCap(apiKeyId: string, credits: number) {
  const [k] = await getDb().select({ cap: schema.apiKey.creditLimit }).from(schema.apiKey).where(eq(schema.apiKey.id, apiKeyId))
  if (!k?.cap) return
  const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0)
  const [used] = await getDb().select({ n: sql<number>`coalesce(sum(${schema.generation.credits}), 0)::int` }).from(schema.generation)
    .where(and(eq(schema.generation.apiKeyId, apiKeyId), gte(schema.generation.createdAt, start), sql`${schema.generation.status} <> 'failed'`))
  if ((used?.n ?? 0) + credits > k.cap) throw new UserError('key_credit_limit', `This API key has reached its monthly limit of ${k.cap.toLocaleString('en-US')} credits.`, 402)
}

/** Creates the generation row and charges its credits in one transaction. */
export async function startGeneration(actor: Actor, opts: { module: Module; units: number; credits: number; input: Record<string, unknown>; voiceId?: string | null; model?: string }): Promise<GenerationRow> {
  await requireModuleFlag(opts.module, actor)
  if (actor.apiKeyId && opts.credits > 0) await checkKeyCap(actor.apiKeyId, opts.credits)
  const { g, balance } = await getDb().transaction(async (tx) => {
    const [g] = await tx.insert(schema.generation).values({
      id: newId('gen'), workspaceId: actor.workspaceId, userId: actor.userId, apiKeyId: actor.apiKeyId, module: opts.module,
      voiceId: opts.voiceId ?? null, model: opts.model ?? 'mock-v1', input: opts.input, units: opts.units, credits: opts.credits, status: 'running',
    }).returning()
    const balance = await chargeCredits({ workspaceId: actor.workspaceId, credits: opts.credits, module: opts.module, refId: g!.id, actorId: actor.userId, tx })
    return { g: g!, balance }
  })
  if (opts.credits > 0 && !balance.unlimited) await checkLowCredits(actor.workspaceId, balance.total + opts.credits, balance.total)
  return g
}

/** Share of the monthly allowance below which a "credits.low" webhook fires (once, as the balance crosses it). */
export const LOW_CREDITS_SHARE = 0.1

async function checkLowCredits(workspaceId: string, before: number, after: number) {
  try {
    const [w] = await getDb().select({ planId: schema.workspace.planId }).from(schema.workspace).where(eq(schema.workspace.id, workspaceId))
    const allowance = w ? getPlan(w.planId).creditsPerMonth : null
    if (!allowance) return
    const line = Math.floor(allowance * LOW_CREDITS_SHARE)
    if (before >= line && after < line) {
      const { emitEvent } = await import('@/server/modules/developers')
      await emitEvent(workspaceId, 'credits.low', { balance: after, threshold: line, allowance })
    }
  } catch (e) { console.error('[webhook] credits.low failed', e) }
}

export const outputKey = (g: { workspaceId: string; id: string }, ext: string) => `${g.workspaceId}/gen/${g.id}.${ext}`

/**
 * Encodes, labels, fingerprints and stores the audio, then marks the generation done.
 * label: false for audio that isn't synthetic (the Voice Isolator's cleaned copy of a user's recording).
 */
export async function finishGeneration(g: GenerationRow, audio: AudioResult, format: AudioFormat = 'wav', opts: { label?: boolean } = {}): Promise<GenerationRow> {
  const label = opts.label !== false
  let bytes: Uint8Array
  let mime: string
  if (format === 'mp3') {
    const mp3 = audio.mimeType === 'audio/mpeg' ? audio.audio : await wavToMp3(audio.audio)
    bytes = label ? tagMp3(mp3, g.id) : mp3; mime = 'audio/mpeg'
  } else {
    if (audio.mimeType !== 'audio/wav') throw new Error('Engine returned MP3 but WAV was requested')
    bytes = label ? tagWav(audio.audio, g.id) : audio.audio; mime = 'audio/wav'
  }
  const key = outputKey(g, format)
  await (await getStorage()).put(key, bytes, mime)
  const [row] = await getDb().update(schema.generation).set({
    status: 'succeeded', outputKey: key, outputMime: mime, durationMs: audio.durationMs, fingerprint: fingerprint(bytes),
    input: { ...g.input, peaks: audio.peaks },
  }).where(eq(schema.generation.id, g.id)).returning()
  return row!
}

export async function failGeneration(g: GenerationRow, message: string): Promise<void> {
  await getDb().update(schema.generation).set({ status: 'failed', error: message }).where(eq(schema.generation.id, g.id))
  await refundCredits({ workspaceId: g.workspaceId, refId: g.id })
}

/** What the browser or API client sees, with a fresh signed URL. */
export async function generationView(g: GenerationRow) {
  const storage = await getStorage()
  const ext = g.outputMime === 'audio/mpeg' ? 'mp3' : 'wav'
  const name = `mimix-${g.module}-${g.id.slice(4, 12)}.${ext}`
  return {
    id: g.id, module: g.module, status: g.status, voiceId: g.voiceId, model: g.model, credits: g.credits, units: g.units,
    text: typeof g.input.text === 'string' ? g.input.text : null, settings: g.input.settings ?? null,
    durationMs: g.durationMs, peaks: Array.isArray(g.input.peaks) ? g.input.peaks : [], mimeType: g.outputMime,
    audioUrl: g.outputKey ? await storage.signedUrl(g.outputKey) : null,
    downloadUrl: g.outputKey ? await storage.signedUrl(g.outputKey, { downloadName: name }) : null,
    error: g.error, createdAt: g.createdAt,
  }
}

export async function listGenerations(workspaceId: string, opts: { module?: Module; before?: Date; limit?: number } = {}) {
  const where = [eq(schema.generation.workspaceId, workspaceId)]
  if (opts.module) where.push(eq(schema.generation.module, opts.module))
  if (opts.before) where.push(lt(schema.generation.createdAt, opts.before))
  return getDb().select().from(schema.generation).where(and(...where)).orderBy(desc(schema.generation.createdAt)).limit(Math.min(opts.limit ?? 20, 100))
}

export async function getGeneration(id: string, workspaceId: string) {
  const [g] = await getDb().select().from(schema.generation).where(and(eq(schema.generation.id, id), eq(schema.generation.workspaceId, workspaceId)))
  return g ?? null
}

/** Deletes the stored audio and the row (history "delete"). Ledger rows stay. */
export async function deleteGeneration(id: string, workspaceId: string): Promise<boolean> {
  const g = await getGeneration(id, workspaceId)
  if (!g) return false
  if (g.outputKey) await (await getStorage()).delete(g.outputKey)
  await getDb().delete(schema.generation).where(eq(schema.generation.id, id))
  return true
}
