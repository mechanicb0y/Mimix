import 'server-only'
import { createHash, randomInt } from 'node:crypto'
import { and, eq, gte, isNotNull, ne, or, sql } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import { attestedConsent, cloneEngine, getVoiceEngine, requireCloning } from '@/server/engine'
import { getStorage } from '@/server/storage'
import { audit } from '@/server/audit'
import { newId } from '@/server/ids'
import { UserError } from '@/server/api/errors'
import { toWav, wavDurationMs } from '@/server/audio'
import { createJob, registerJobHandler, type JobContext } from '@/server/jobs'
import { consumeUploads, takeUploads } from '@/server/uploads'
import { matchesBlocklist } from '@/server/voices'
import { assertVoiceSlot, voiceView, workspacePlan } from '@/server/modules/voices'
import { compareSpeakers, embedSpeaker, meanSpeaker, speakerVerifier } from '@/server/speaker-verifier'
import { ENGINE_LIMITS } from '@/config/engine-limits'
import { planHas } from '@/config/plans'
import { emitEvent } from '@/server/modules/developers'
import { getMessages, fmt } from '@/i18n'
import type { CreateCloneInput, VerifyConsentInput } from '@/lib/schemas/clone'
import type { Actor } from '@/server/generations'

/** Consent phrases expire quickly so a recording made for one attempt can't be replayed later. */
export const PHRASE_TTL_MINUTES = 10
/** Failed consent attempts allowed per voice in 24 hours. */
export const CONSENT_MAX_FAILURES = 5
/** Phrase match needed (share of the phrase's words heard in order). */
export const PHRASE_MATCH = 0.8
const SAMPLE_RATE = 16000

const sha256 = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const errs = () => getMessages('en').app.voices.errors
const secondsText = (ms: number) => (ms >= 120_000 ? `${Math.round(ms / 60_000)} minutes` : `${Math.round(ms / 1000)} seconds`)

/* -------------------------------------------------------------- step 1: create */

/**
 * Starts a clone: checks the name, plan limits and files, creates the voice in "processing", and
 * queues a job that converts the samples, measures the speech and fingerprints the speaker.
 * The voice can't be used until its speaker passes the consent check (step 2). With
 * CLONE_CONSENT=attest there is no step 2: the job switches the voice on, on the uploader's
 * confirmation (rightsConfirmed), which is kept as a consent record.
 */
export async function createClone(actor: Actor & { ipAddress?: string | null }, input: CreateCloneInput) {
  const t = errs()
  if (await matchesBlocklist(input.name)) throw new UserError('blocked_name', t.blockedName, 422, { name: t.blockedName })
  requireCloning()
  const engine = cloneEngine()
  if (input.kind === 'instant' ? !engine.capabilities.instantClone : !engine.capabilities.professionalClone) {
    throw new UserError('engine_unsupported', getMessages('en').errors.app.engine.unsupported, 501)
  }
  if (input.kind === 'instant' && !planHas(await workspacePlan(actor.workspaceId), 'instantClone')) throw new UserError('plan_feature', t.instantNotIncluded, 403, { kind: t.instantNotIncluded })
  await assertVoiceSlot(actor.workspaceId)
  if (input.kind === 'professional') await assertProfessionalSlot(actor.workspaceId)
  // Fails early on missing or used uploads; the job reads them again.
  const uploads = await takeUploads(actor.workspaceId, input.uploadIds, 'voice_sample')
  const id = newId('voice')
  await getDb().insert(schema.voice).values({
    id, workspaceId: actor.workspaceId, ownerUserId: actor.userId, name: input.name, description: input.description,
    kind: input.kind === 'instant' ? 'instant_clone' : 'professional_clone', status: 'processing', licence: input.licence,
    params: {}, engine: engine.id, language: input.language,
  })
  const job = await createJob({ workspaceId: actor.workspaceId, userId: actor.userId, type: 'clone_prepare', input: { voiceId: id, kind: input.kind, uploadIds: uploads.map((u) => u.id), ipAddress: actor.ipAddress ?? null } })
  await audit({ actorId: actor.userId, action: 'voice.clone_started', targetType: 'voice', targetId: id, after: { kind: input.kind, files: uploads.length } })
  return { voice: await voiceView((await getVoice(id))!, { workspaceId: actor.workspaceId }), jobId: job.id }
}

async function assertProfessionalSlot(workspaceId: string) {
  const plan = await workspacePlan(workspaceId)
  const t = errs()
  if (plan.professionalClones === 0 && plan.id !== 'enterprise') throw new UserError('plan_feature', t.proNotIncluded, 403, { kind: t.proNotIncluded })
  if (plan.id === 'enterprise') return
  const [n] = await getDb().select({ n: sql<number>`count(*)::int` }).from(schema.voice)
    .where(and(eq(schema.voice.workspaceId, workspaceId), eq(schema.voice.kind, 'professional_clone'), ne(schema.voice.status, 'deleted')))
  if ((n?.n ?? 0) >= plan.professionalClones) throw new UserError('pro_clone_limit', fmt(t.proLimit, { limit: plan.professionalClones }), 403, { kind: fmt(t.proLimit, { limit: plan.professionalClones }) })
}

async function getVoice(id: string) {
  const [v] = await getDb().select().from(schema.voice).where(eq(schema.voice.id, id))
  return v ?? null
}

/**
 * Job: convert, measure and fingerprint the samples. On success the voice waits for consent, or with
 * CLONE_CONSENT=attest is switched on (an instant clone) or queued for training (a professional one).
 */
async function prepareSamples(ctx: JobContext) {
  const { voiceId, kind, uploadIds, ipAddress } = ctx.job.input as { voiceId: string; kind: 'instant' | 'professional'; uploadIds: string[]; ipAddress?: string | null }
  const t = errs()
  const fail = async (message: string) => {
    await getDb().update(schema.voice).set({ status: 'deleted' }).where(eq(schema.voice.id, voiceId))
    throw new UserError('clone_samples', message, 422)
  }
  const uploads = await takeUploads(ctx.job.workspaceId, uploadIds, 'voice_sample')
  const storage = await getStorage()
  const embeddings: number[][] = []
  let speechMs = 0; let totalMs = 0
  const samples: Array<typeof schema.voiceSample.$inferInsert> = []
  for (const [i, u] of uploads.entries()) {
    await ctx.checkCancelled()
    await ctx.progress((i / uploads.length) * 90, u.filename)
    let wav: Uint8Array
    try { wav = await toWav(u.data, SAMPLE_RATE) } catch { return fail(fmt(t.unreadable, { file: u.filename })) }
    const emb = await embedSpeaker(wav)
    if (!emb.voicedMs || !emb.v.length) return fail(fmt(t.noSpeech, { file: u.filename }))
    const durationMs = wavDurationMs(wav)
    embeddings.push(emb.v); speechMs += emb.voicedMs; totalMs += durationMs
    const sid = newId('smp')
    const key = `${ctx.job.workspaceId}/voices/${voiceId}/samples/${sid}.wav`
    await storage.put(key, wav, 'audio/wav')
    samples.push({ id: sid, voiceId, storageKey: key, mime: 'audio/wav', bytes: wav.byteLength, durationMs, sha256: sha256(wav) })
  }
  const min = kind === 'instant' ? ENGINE_LIMITS.cloneInstantMinSeconds.value * 1000 : ENGINE_LIMITS.cloneProfessionalMinMinutes.value * 60_000
  const max = kind === 'instant' ? ENGINE_LIMITS.cloneInstantMaxSeconds.value * 1000 : ENGINE_LIMITS.cloneProfessionalMaxMinutes.value * 60_000
  const cleanup = async () => { for (const s of samples) await storage.delete(s.storageKey) }
  if (speechMs < min) { await cleanup(); return fail(fmt(kind === 'instant' ? t.tooShort : t.tooShortPro, { found: secondsText(speechMs), min: secondsText(min) })) }
  if (totalMs > max * 1.5) { await cleanup(); return fail(fmt(t.tooLong, { found: secondsText(totalMs), max: secondsText(max) })) }
  const embedding = meanSpeaker(embeddings)
  if (await matchesTakenDown(embedding)) {
    await cleanup()
    await audit({ actorId: ctx.job.userId, action: 'voice.clone_blocked', targetType: 'voice', targetId: voiceId, reason: 'matches_taken_down' })
    return fail(t.blockedVoice)
  }
  await getDb().transaction(async (tx) => {
    await tx.insert(schema.voiceSample).values(samples)
    await tx.update(schema.voice).set({ status: 'pending_consent', speakerEmbedding: embedding }).where(eq(schema.voice.id, voiceId))
  })
  await consumeUploads(uploads)
  if (!attestedConsent()) return { voiceId, speechMs, files: samples.length }

  await ctx.progress(92, 'consent')
  const v = (await getVoice(voiceId))!
  const userId = ctx.job.userId ?? v.ownerUserId
  if (!userId) return fail(t.notFound)
  await recordAttestation(userId, voiceId, ipAddress ?? null)
  if (kind === 'professional') {
    await getDb().update(schema.voice).set({ status: 'processing' }).where(eq(schema.voice.id, voiceId))
    const job = await createJob({ workspaceId: ctx.job.workspaceId, userId, type: 'clone_professional', input: { voiceId } })
    return { voiceId, speechMs, files: samples.length, active: false, trainingJobId: job.id }
  }
  try { await activateClone(voiceId, 'instant') } catch (e) {
    // The engine couldn't make the voice: start again from the samples rather than leave it waiting
    // for a consent step that doesn't exist in this mode.
    await getDb().update(schema.voice).set({ status: 'deleted' }).where(eq(schema.voice.id, voiceId))
    throw e
  }
  return { voiceId, speechMs, files: samples.length, active: true, trainingJobId: null }
}

/** Does this speaker closely match a voice removed after a report? */
async function matchesTakenDown(embedding: number[]): Promise<boolean> {
  const rows = await getDb().select({ e: schema.voice.speakerEmbedding }).from(schema.voice)
    .where(and(eq(schema.voice.status, 'taken_down'), isNotNull(schema.voice.speakerEmbedding)))
  const { takedown } = speakerVerifier()
  return rows.some((r) => compareSpeakers(embedding, r.e ?? []) >= takedown)
}

/**
 * The samples' speaker embedding from the verifier in use. A voice prepared before the verifier changed
 * (for example from the stand-in to the neural model) is measured again from its stored samples.
 */
async function samplesEmbedding(v: typeof schema.voice.$inferSelect, probe: number[]): Promise<number[]> {
  const stored = v.speakerEmbedding ?? []
  if (stored.length === probe.length) return stored
  const storage = await getStorage()
  const rows = await getDb().select().from(schema.voiceSample).where(eq(schema.voiceSample.voiceId, v.id))
  const list: number[][] = []
  for (const r of rows) {
    const b = await storage.get(r.storageKey)
    if (b) { const e = await embedSpeaker(b); if (e.v.length) list.push(e.v) }
  }
  const embedding = meanSpeaker(list)
  if (embedding.length) await getDb().update(schema.voice).set({ speakerEmbedding: embedding }).where(eq(schema.voice.id, v.id))
  return embedding
}

/* -------------------------------------------------------------- step 2: consent */

/** Keeps the uploader's confirmation (CLONE_CONSENT=attest) as a consent record and in the audit log. */
async function recordAttestation(userId: string, voiceId: string, ipAddress: string | null) {
  const id = newId('cns')
  await getDb().insert(schema.consentRecord).values({
    id, voiceId, userId, method: 'attest', phrase: getMessages('en').app.clone.rights, phraseIssuedAt: new Date(), verified: true, ipAddress,
  })
  await audit({ actorId: userId, action: 'voice.consent_attested', targetType: 'voice', targetId: voiceId, after: { consentId: id } })
}

/**
 * CLONE_CONSENT=attest, for a voice still waiting for consent (made before the setting changed, or
 * whose switch-on failed): records the confirmation and switches it on, or queues its training.
 */
export async function attestConsent(actor: Actor & { ipAddress?: string | null }, voiceId: string) {
  requireCloning()
  if (!attestedConsent()) throw new UserError('consent_recording_required', getMessages('en').errors.app.consentRequired, 409)
  if (!actor.userId) throw new UserError('unauthenticated', getMessages('en').errors.app.unauthenticated, 401)
  const v = await pendingVoice(actor.workspaceId, voiceId)
  await recordAttestation(actor.userId, voiceId, actor.ipAddress ?? null)
  return switchOn(actor, v)
}

async function pendingVoice(workspaceId: string, voiceId: string) {
  const v = await getVoice(voiceId)
  if (!v || v.workspaceId !== workspaceId || v.status === 'deleted') throw new UserError('voice_not_found', errs().notFound, 404)
  if (v.status !== 'pending_consent') throw new UserError('not_pending_consent', errs().notPendingConsent, 409)
  return v
}

function makePhrase(): string {
  const p = getMessages('en').app.consentPhrase
  const pool = [...p.words]
  const pick = () => pool.splice(randomInt(pool.length), 1)[0]!
  return fmt(p.template, { a: pick(), b: pick(), c: pick() })
}

async function failuresToday(voiceId: string) {
  const since = new Date(Date.now() - 24 * 3600_000)
  const rows = await getDb().select({ at: schema.consentRecord.createdAt }).from(schema.consentRecord)
    .where(and(eq(schema.consentRecord.voiceId, voiceId), eq(schema.consentRecord.verified, false), isNotNull(schema.consentRecord.audioSha256), gte(schema.consentRecord.createdAt, since)))
    .orderBy(schema.consentRecord.createdAt)
  return rows.map((r) => r.at)
}

async function assertNotLocked(voiceId: string) {
  const fails = await failuresToday(voiceId)
  if (fails.length >= CONSENT_MAX_FAILURES) {
    const until = new Date(fails[fails.length - CONSENT_MAX_FAILURES]!.getTime() + 24 * 3600_000)
    throw new UserError('consent_locked', fmt(errs().consentLocked, { time: until.toUTCString().replace(/:\d\d GMT$/, ' UTC') }), 429)
  }
  return CONSENT_MAX_FAILURES - fails.length
}

/** Issues a fresh random phrase for the speaker to read. Each attempt gets its own record. */
export async function issuePhrase(actor: Actor & { ipAddress?: string | null }, voiceId: string) {
  requireCloning()
  await pendingVoice(actor.workspaceId, voiceId)
  const attemptsLeft = await assertNotLocked(voiceId)
  if (!actor.userId) throw new UserError('unauthenticated', getMessages('en').errors.app.unauthenticated, 401)
  const [r] = await getDb().insert(schema.consentRecord).values({
    id: newId('cns'), voiceId, userId: actor.userId, phrase: makePhrase(), phraseIssuedAt: new Date(), ipAddress: actor.ipAddress ?? null,
  }).returning()
  return { consentId: r!.id, phrase: r!.phrase, expiresAt: new Date(r!.phraseIssuedAt.getTime() + PHRASE_TTL_MINUTES * 60_000), attemptsLeft }
}

const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s']/gu, ' ').split(/\s+/).filter(Boolean)

/** Share of the phrase's words heard in the same order (longest common subsequence). */
export function phraseScore(heard: string, phrase: string): number {
  const a = words(phrase); const b = words(heard)
  if (!a.length) return 0
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i]![j] = a[i - 1] === b[j - 1] ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)
  return Math.round((dp[a.length]![b.length]! / a.length) * 1000) / 1000
}

/**
 * The preview engine can't recognise words, so with it the phrase check only confirms the
 * recording holds about as much speech as the phrase needs (60 ms to 1.5 s per word).
 */
function lengthScore(voicedMs: number, phrase: string): number {
  const n = words(phrase).length
  return voicedMs >= n * 60 && voicedMs <= n * 1500 ? 1 : 0
}

/**
 * Checks the consent recording: the phrase must be fresh and unused, the words must match, and the
 * speaker must match the samples. Every attempt is kept as a consent record with the audio hash.
 * On success an instant clone is created at once; a professional clone is queued for training.
 */
export async function verifyConsent(actor: Actor & { ipAddress?: string | null }, voiceId: string, input: VerifyConsentInput) {
  requireCloning()
  const t = errs()
  const v = await pendingVoice(actor.workspaceId, voiceId)
  await assertNotLocked(voiceId)
  const [rec] = await getDb().select().from(schema.consentRecord).where(and(eq(schema.consentRecord.id, input.consentId), eq(schema.consentRecord.voiceId, voiceId)))
  /** A used or expired phrase: refuse, and hand back a fresh one so the speaker can read again. */
  const fresh = async (code: string, message: string): Promise<never> => {
    const next = await issuePhrase(actor, voiceId)
    throw new UserError(code, message, 409, undefined, { next, attemptsLeft: next.attemptsLeft })
  }
  if (!rec || rec.audioSha256) return fresh('consent_used', t.consentUsed)
  if (Date.now() - rec.phraseIssuedAt.getTime() > PHRASE_TTL_MINUTES * 60_000) return fresh('consent_expired', t.consentExpired)

  const [u] = await takeUploads(actor.workspaceId, [input.uploadId], 'consent')
  let wav: Uint8Array
  try { wav = await toWav(u!.data, SAMPLE_RATE) } catch { throw new UserError('unreadable', fmt(t.unreadable, { file: u!.filename }), 422, { uploadId: fmt(t.unreadable, { file: u!.filename }) }) }
  const emb = await embedSpeaker(wav)
  const engine = getVoiceEngine()
  const { match } = speakerVerifier()
  const speakerScore = emb.v.length ? compareSpeakers(emb.v, await samplesEmbedding(v, emb.v)) : 0
  const heard = engine.isMock ? null : (await engine.transcribe({ audio: wav, speakers: 1 })).segments.map((s) => s.text).join(' ')
  const pScore = heard === null ? lengthScore(emb.voicedMs, rec.phrase) : phraseScore(heard, rec.phrase)
  const verified = emb.voicedMs > 0 && speakerScore >= match && pScore >= PHRASE_MATCH
  const storage = await getStorage()
  const key = `${actor.workspaceId}/consent/${rec.id}.wav`
  await storage.put(key, wav, 'audio/wav')
  await getDb().update(schema.consentRecord).set({
    audioStorageKey: key, audioSha256: sha256(wav), speakerScore, phraseScore: pScore, verified, ipAddress: actor.ipAddress ?? rec.ipAddress,
  }).where(eq(schema.consentRecord.id, rec.id))
  await consumeUploads([u!])
  await audit({ actorId: actor.userId, action: verified ? 'voice.consent_verified' : 'voice.consent_failed', targetType: 'voice', targetId: voiceId, after: { consentId: rec.id, speakerScore, phraseScore: pScore } })

  if (!verified) {
    const reason = emb.voicedMs === 0 || !emb.v.length ? ['consent_too_short', t.consentTooShort] : speakerScore < match ? ['consent_voice_mismatch', t.consentVoiceMismatch] : ['consent_phrase_mismatch', t.consentPhraseMismatch]
    let next: Awaited<ReturnType<typeof issuePhrase>> | null = null
    try { next = await issuePhrase(actor, voiceId) } catch { /* locked: no new phrase */ }
    throw new UserError(reason[0]!, reason[1]!, 422, undefined, { next, attemptsLeft: next?.attemptsLeft ?? 0 })
  }

  return switchOn(actor, v)
}

/** After consent: an instant clone is made at once; a professional clone is queued for training. */
async function switchOn(actor: Actor, v: typeof schema.voice.$inferSelect) {
  if (v.kind === 'instant_clone') {
    await activateClone(v.id, 'instant')
    return { verified: true as const, voice: await voiceView((await getVoice(v.id))!, { workspaceId: actor.workspaceId }), jobId: null }
  }
  await getDb().update(schema.voice).set({ status: 'processing' }).where(eq(schema.voice.id, v.id))
  const job = await createJob({ workspaceId: actor.workspaceId, userId: actor.userId, type: 'clone_professional', input: { voiceId: v.id } })
  return { verified: true as const, voice: await voiceView((await getVoice(v.id))!, { workspaceId: actor.workspaceId }), jobId: job.id }
}

/** Sends the samples to the engine and switches the voice on. */
async function activateClone(voiceId: string, kind: 'instant' | 'professional', ctx?: JobContext) {
  const v = (await getVoice(voiceId))!
  const storage = await getStorage()
  const rows = await getDb().select().from(schema.voiceSample).where(eq(schema.voiceSample.voiceId, voiceId))
  const samples: Uint8Array[] = []
  for (const r of rows) { const b = await storage.get(r.storageKey); if (b) samples.push(b) }
  await ctx?.progress(20, 'training')
  const engine = cloneEngine()
  const made = await engine.clone({ samples, name: v.name, kind, language: v.language })
  await ctx?.checkCancelled()
  await getDb().update(schema.voice).set({
    status: 'active', engine: engine.id, engineVoiceId: made.engineVoiceId ?? null, params: made.params as unknown as Record<string, number>,
  }).where(eq(schema.voice.id, voiceId))
  await audit({ actorId: v.ownerUserId, action: 'voice.clone_ready', targetType: 'voice', targetId: voiceId, after: { kind, engine: engine.id } })
  if (v.workspaceId) await emitEvent(v.workspaceId, 'voice.ready', { voice: { id: voiceId, name: v.name, kind: v.kind } })
  return { voiceId }
}

/** The owner's consent records for a voice ("a record you can show"). */
export async function consentRecords(workspaceId: string, voiceId: string) {
  const v = await getVoice(voiceId)
  if (!v || v.workspaceId !== workspaceId) throw new UserError('voice_not_found', errs().notFound, 404)
  const rows = await getDb().select().from(schema.consentRecord)
    .where(and(eq(schema.consentRecord.voiceId, voiceId), or(isNotNull(schema.consentRecord.audioSha256), eq(schema.consentRecord.method, 'attest'))))
    .orderBy(schema.consentRecord.createdAt)
  return rows.map((r) => ({ id: r.id, method: r.method, phrase: r.phrase, phraseIssuedAt: r.phraseIssuedAt, recordedAt: r.createdAt, verified: r.verified, speakerScore: r.speakerScore, phraseScore: r.phraseScore, audioSha256: r.audioSha256 }))
}

registerJobHandler('clone_prepare', prepareSamples)
registerJobHandler('clone_professional', async (ctx) => {
  const { voiceId } = ctx.job.input as { voiceId: string }
  try { return await activateClone(voiceId, 'professional', ctx) } catch (e) {
    // Training failed after retries: the samples are kept and the speaker records the phrase again.
    await getDb().update(schema.voice).set({ status: 'pending_consent' }).where(and(eq(schema.voice.id, voiceId), eq(schema.voice.status, 'processing')))
    throw e
  }
})
