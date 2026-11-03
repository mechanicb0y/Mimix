/**
 * Mimix database schema (Postgres). The same schema runs on local PGlite (development and tests)
 * and on Supabase Postgres (production); only DATABASE_URL changes.
 *
 * Conventions: text ids (Better Auth generates its own; app tables use prefixed ids from `newId`),
 * timestamps with time zone, money in minor units, credits as integers. Authorization is enforced in
 * server code on every query; row-level security on every table (drizzle/0007) shuts out Supabase’s public API roles as defense in depth.
 */
import { sql } from 'drizzle-orm'
import { API_SCOPES, WEBHOOK_EVENTS, type ApiScope } from '@/config/api'
import {
  bigint, boolean, check, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uniqueIndex,
} from 'drizzle-orm/pg-core'

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })
const createdAt = () => ts('created_at').notNull().defaultNow()
const updatedAt = () => ts('updated_at').notNull().defaultNow().$onUpdate(() => new Date())

/* ------------------------------------------------------------------ Auth (Better Auth) */

export const ROLES = ['owner', 'admin', 'moderator', 'support', 'user'] as const
export type Role = (typeof ROLES)[number]
export const USER_STATUSES = ['active', 'suspended', 'banned'] as const

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  /** Platform role (section 8). Workspace roles live in workspace_member. */
  role: text('role', { enum: ROLES }).notNull().default('user'),
  status: text('status', { enum: USER_STATUSES }).notNull().default('active'),
  /** The workspace opened after sign-in. */
  defaultWorkspaceId: text('default_workspace_id'),
  locale: text('locale').notNull().default('en'),
  failedLoginCount: integer('failed_login_count').notNull().default(0),
  lockedUntil: ts('locked_until'),
  /** Set when the user asks to delete the account; data is purged after the grace period. */
  deletionRequestedAt: ts('deletion_requested_at'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: ts('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('session_user_idx').on(t.userId)])

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: ts('access_token_expires_at'),
  refreshTokenExpiresAt: ts('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('account_user_idx').on(t.userId)])

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: ts('expires_at').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('verification_identifier_idx').on(t.identifier)])

export const twoFactor = pgTable('two_factor', {
  id: text('id').primaryKey(),
  secret: text('secret').notNull(),
  backupCodes: text('backup_codes').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  verified: boolean('verified').default(true),
  failedVerificationCount: integer('failed_verification_count').default(0),
  lockedUntil: ts('locked_until'),
}, (t) => [index('two_factor_user_idx').on(t.userId), index('two_factor_secret_idx').on(t.secret)])

/** Better Auth rate-limit counters, shared by every server instance (serverless-safe). */
export const rateLimit = pgTable('rate_limit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
})

/* ------------------------------------------------------------------ Workspaces and billing */

export const PLAN_IDS = ['free', 'maker', 'pro', 'production', 'team', 'enterprise'] as const
export type PlanId = (typeof PLAN_IDS)[number]
export const WORKSPACE_ROLES = ['owner', 'admin', 'member', 'viewer'] as const
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]
export const SUBSCRIPTION_STATUSES = ['none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'] as const

export const workspace = pgTable('workspace', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  planId: text('plan_id', { enum: PLAN_IDS }).notNull().default('free'),
  billingPeriod: text('billing_period', { enum: ['monthly', 'annual'] }).notNull().default('monthly'),
  currency: text('currency').notNull().default('USD'),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  subscriptionStatus: text('subscription_status', { enum: SUBSCRIPTION_STATUSES }).notNull().default('none'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  /** Start of the current credit cycle; credits reset monthly from here (annual plans too). */
  cycleStartedAt: ts('cycle_started_at').notNull().defaultNow(),
  cycleEndsAt: ts('cycle_ends_at').notNull().default(sql`now() + interval '1 month'`),
  /** Cached balance; credit_ledger is the source of truth and is summed to rebuild it. */
  creditBalance: bigint('credit_balance', { mode: 'number' }).notNull().default(0),
  /** Top-up credits do not reset monthly. */
  topUpBalance: bigint('top_up_balance', { mode: 'number' }).notNull().default(0),
  /** Owner accounts (super-admin) have no quotas. */
  unlimited: boolean('unlimited').notNull().default(false),
  /** A plan given free by staff, without Stripe (testers, partners). */
  comped: boolean('comped').notNull().default(false),
  /** When a staff-given plan ends and the workspace returns to Free. null = no end date. */
  compUntil: ts('comp_until'),
  seats: integer('seats').notNull().default(1),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [check('credit_balance_nonneg', sql`${t.creditBalance} >= 0`), check('top_up_nonneg', sql`${t.topUpBalance} >= 0`)])

export const workspaceMember = pgTable('workspace_member', {
  workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text('role', { enum: WORKSPACE_ROLES }).notNull().default('member'),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.workspaceId, t.userId] }), index('member_user_idx').on(t.userId)])

export const workspaceInvite = pgTable('workspace_invite', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role', { enum: WORKSPACE_ROLES }).notNull().default('member'),
  /** sha256 of the invite token; the token itself is only in the email. */
  tokenHash: text('token_hash').notNull().unique(),
  invitedBy: text('invited_by').notNull().references(() => user.id),
  expiresAt: ts('expires_at').notNull(),
  acceptedAt: ts('accepted_at'),
  createdAt: createdAt(),
}, (t) => [index('invite_workspace_idx').on(t.workspaceId)])

export const LEDGER_REASONS = ['plan_grant', 'monthly_reset', 'top_up', 'usage', 'refund', 'admin_adjustment', 'expiry'] as const

/** Append-only. Every change to a workspace's credits is one row. */
export const creditLedger = pgTable('credit_ledger', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  delta: bigint('delta', { mode: 'number' }).notNull(),
  /** Which bucket the delta applied to. */
  bucket: text('bucket', { enum: ['plan', 'top_up'] }).notNull().default('plan'),
  reason: text('reason', { enum: LEDGER_REASONS }).notNull(),
  module: text('module'),
  refId: text('ref_id'),
  actorId: text('actor_id'),
  note: text('note'),
  balanceAfter: bigint('balance_after', { mode: 'number' }).notNull(),
  createdAt: createdAt(),
}, (t) => [index('ledger_workspace_time_idx').on(t.workspaceId, t.createdAt), uniqueIndex('ledger_ref_once_idx').on(t.reason, t.refId).where(sql`${t.refId} is not null and ${t.reason} in ('usage','refund','top_up')`)])

export const invoice = pgTable('invoice', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  stripeInvoiceId: text('stripe_invoice_id').unique(),
  number: text('number'),
  amountDue: integer('amount_due').notNull(),
  amountPaid: integer('amount_paid').notNull().default(0),
  tax: integer('tax').notNull().default(0),
  currency: text('currency').notNull(),
  status: text('status').notNull(),
  hostedUrl: text('hosted_url'),
  pdfUrl: text('pdf_url'),
  periodStart: ts('period_start'),
  periodEnd: ts('period_end'),
  createdAt: createdAt(),
}, (t) => [index('invoice_workspace_idx').on(t.workspaceId)])

/** Webhook idempotency: each Stripe event id is processed once. */
export const stripeEvent = pgTable('stripe_event', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  processedAt: createdAt(),
})

/* ------------------------------------------------------------------ Voices */

export const VOICE_KINDS = ['library', 'instant_clone', 'professional_clone', 'designed', 'mixed'] as const
export type VoiceKind = (typeof VOICE_KINDS)[number]
export const VOICE_STATUSES = ['draft', 'pending_consent', 'processing', 'active', 'disabled', 'taken_down', 'deleted'] as const
/** remix: may be mixed by anyone who can use it. standard: usable, not mixable. private: owner's workspace only. */
export const VOICE_LICENCES = ['remix', 'standard', 'private'] as const
export type VoiceLicence = (typeof VOICE_LICENCES)[number]
export const PUBLISH_STATUSES = ['none', 'pending', 'approved', 'rejected'] as const

export const voice = pgTable('voice', {
  id: text('id').primaryKey(),
  /** null for Mimix library voices. */
  workspaceId: text('workspace_id').references(() => workspace.id, { onDelete: 'cascade' }),
  ownerUserId: text('owner_user_id').references(() => user.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  kind: text('kind', { enum: VOICE_KINDS }).notNull(),
  status: text('status', { enum: VOICE_STATUSES }).notNull().default('draft'),
  licence: text('licence', { enum: VOICE_LICENCES }).notNull().default('private'),
  /** Engine-neutral acoustic parameters (the mock engine renders these; real engines keep their own id). */
  params: jsonb('params').$type<Record<string, number>>().notNull(),
  engine: text('engine').notNull().default('mock'),
  engineVoiceId: text('engine_voice_id'),
  language: text('language').notNull().default('en'),
  accent: text('accent').notNull().default(''),
  gender: text('gender').notNull().default('neutral'),
  age: text('age').notNull().default('middle'),
  useCase: text('use_case').notNull().default('narration'),
  previewKey: text('preview_key'),
  publishStatus: text('publish_status', { enum: PUBLISH_STATUSES }).notNull().default('none'),
  publishNote: text('publish_note'),
  takedownReason: text('takedown_reason'),
  /** Speaker fingerprint of the samples (src/server/speaker.ts), for consent checks and takedown matching. */
  speakerEmbedding: real('speaker_embedding').array(),
  /**
   * Mixer-engine recipe ("af_heart:0.6,am_michael:0.4;speed=1;pitch=0;warmth=0") for Kokoro library
   * voices and the mixes built from them. Kept after a mix is cloned onto the main engine, so it can
   * still be used as a Mixer source.
   */
  mixRecipe: text('mix_recipe'),
  /** Where "mix, then clone" stands for this mix: null (not tried), pending, done or failed. */
  promoteStatus: text('promote_status', { enum: ['pending', 'done', 'failed'] }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('voice_workspace_idx').on(t.workspaceId), index('voice_public_idx').on(t.publishStatus, t.status)])

export const voiceSample = pgTable('voice_sample', {
  id: text('id').primaryKey(),
  voiceId: text('voice_id').notNull().references(() => voice.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull(),
  mime: text('mime').notNull(),
  bytes: integer('bytes').notNull(),
  durationMs: integer('duration_ms').notNull(),
  sha256: text('sha256').notNull(),
  createdAt: createdAt(),
}, (t) => [index('sample_voice_idx').on(t.voiceId)])

/** Section 9: one record per verification attempt. Kept after voice deletion for the documented period. */
export const consentRecord = pgTable('consent_record', {
  id: text('id').primaryKey(),
  voiceId: text('voice_id').references(() => voice.id, { onDelete: 'set null' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  phrase: text('phrase').notNull(),
  phraseIssuedAt: ts('phrase_issued_at').notNull(),
  audioStorageKey: text('audio_storage_key'),
  audioSha256: text('audio_sha256'),
  /** Speaker-verification similarity between the consent audio and the samples, 0 to 1. */
  speakerScore: real('speaker_score'),
  /** How closely the spoken words matched the phrase, 0 to 1. */
  phraseScore: real('phrase_score'),
  verified: boolean('verified').notNull().default(false),
  /** "recording": the speaker read the phrase. "attest": the uploader confirmed they are the speaker or have the speaker's permission (CLONE_CONSENT=attest); phrase holds the statement they confirmed. */
  method: text('method', { enum: ['recording', 'attest'] }).notNull().default('recording'),
  ipAddress: text('ip_address'),
  createdAt: createdAt(),
}, (t) => [index('consent_voice_idx').on(t.voiceId)])

export const voiceLineage = pgTable('voice_lineage', {
  mixVoiceId: text('mix_voice_id').notNull().references(() => voice.id, { onDelete: 'cascade' }),
  sourceVoiceId: text('source_voice_id').notNull().references(() => voice.id, { onDelete: 'restrict' }),
  weight: real('weight').notNull(),
}, (t) => [primaryKey({ columns: [t.mixVoiceId, t.sourceVoiceId] }), index('lineage_source_idx').on(t.sourceVoiceId)])

export const savedVoice = pgTable('saved_voice', {
  workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  voiceId: text('voice_id').notNull().references(() => voice.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.workspaceId, t.voiceId] })])

/** Names of public figures whose voices may not be cloned or mixed (managed in the admin console). */
export const blockedVoice = pgTable('blocked_voice', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  aliases: text('aliases').array().notNull().default(sql`'{}'::text[]`),
  reason: text('reason').notNull().default('public_figure'),
  createdAt: createdAt(),
})

/* ------------------------------------------------------------------ Generations, jobs, media */

export const MODULES = ['tts', 'mix_preview', 'mix_save', 'clone', 'design', 'changer', 'stt', 'dubbing', 'sfx', 'isolator', 'studio', 'studio_export'] as const
export type Module = (typeof MODULES)[number]
export const JOB_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'canceled'] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

/** Every billable operation, short or long. Long ones also have a job row. */
export const generation = pgTable('generation', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  apiKeyId: text('api_key_id'),
  module: text('module', { enum: MODULES }).notNull(),
  voiceId: text('voice_id').references(() => voice.id, { onDelete: 'set null' }),
  model: text('model').notNull().default('mock-v1'),
  input: jsonb('input').$type<Record<string, unknown>>().notNull().default({}),
  /** Characters for speech, seconds for audio inputs. */
  units: integer('units').notNull().default(0),
  credits: integer('credits').notNull().default(0),
  status: text('status', { enum: JOB_STATUSES }).notNull().default('queued'),
  outputKey: text('output_key'),
  outputMime: text('output_mime'),
  durationMs: integer('duration_ms'),
  error: text('error'),
  flagged: boolean('flagged').notNull().default(false),
  /** sha256 of the output audio, for provenance checks ("was this made with Mimix?"). */
  fingerprint: text('fingerprint'),
  createdAt: createdAt(),
}, (t) => [index('generation_fingerprint_idx').on(t.fingerprint), index('generation_workspace_time_idx').on(t.workspaceId, t.createdAt), index('generation_module_idx').on(t.module)])

export const job = pgTable('job', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  generationId: text('generation_id').references(() => generation.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  status: text('status', { enum: JOB_STATUSES }).notNull().default('queued'),
  progress: integer('progress').notNull().default(0),
  message: text('message'),
  input: jsonb('input').$type<Record<string, unknown>>().notNull().default({}),
  output: jsonb('output').$type<Record<string, unknown>>(),
  error: text('error'),
  attempts: integer('attempts').notNull().default(0),
  createdAt: createdAt(),
  startedAt: ts('started_at'),
  finishedAt: ts('finished_at'),
}, (t) => [index('job_workspace_idx').on(t.workspaceId, t.createdAt), index('job_status_idx').on(t.status)])

export const pronunciationRule = pgTable('pronunciation_rule', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  term: text('term').notNull(),
  /** "alias": say `replacement` instead. "ipa": `replacement` is IPA (used by engines that support it). */
  type: text('type', { enum: ['alias', 'ipa'] }).notNull().default('alias'),
  replacement: text('replacement').notNull(),
  caseSensitive: boolean('case_sensitive').notNull().default(false),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('pron_workspace_term_idx').on(t.workspaceId, t.term)])

export interface TranscriptSegment { startMs: number; endMs: number; speaker: string; text: string }

/** One dubbed language: translated lines, what was last rendered, and the output files. */
export interface DubOutput {
  segments: TranscriptSegment[]
  status: 'pending' | 'rendering' | 'done' | 'failed'
  /** Hash of text + voice per line at the last render, to price re-renders by changed lines. */
  rendered?: string[]
  generationId?: string
  videoKey?: string
  error?: string
}

export const transcript = pgTable('transcript', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  jobId: text('job_id').references(() => job.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  language: text('language').notNull().default('en'),
  sourceKey: text('source_key').notNull(),
  durationMs: integer('duration_ms').notNull().default(0),
  segments: jsonb('segments').$type<TranscriptSegment[]>().notNull().default([]),
  speakerNames: jsonb('speaker_names').$type<Record<string, string>>().notNull().default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('transcript_workspace_idx').on(t.workspaceId)])

export const dubbingProject = pgTable('dubbing_project', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  sourceKey: text('source_key').notNull(),
  sourceMime: text('source_mime').notNull(),
  sourceLanguage: text('source_language').notNull(),
  targetLanguages: text('target_languages').array().notNull(),
  durationMs: integer('duration_ms').notNull().default(0),
  /** Source transcript, editable before rendering. */
  segments: jsonb('segments').$type<TranscriptSegment[]>().notNull().default([]),
  /** Per language: translated segments and the rendered output key. */
  outputs: jsonb('outputs').$type<Record<string, DubOutput>>().notNull().default({}),
  status: text('status', { enum: ['uploaded', 'transcribing', 'ready_to_edit', 'rendering', 'done', 'failed'] }).notNull().default('uploaded'),
  /** Speaker label → voice id used for that speaker in every language. */
  cast: jsonb('cast').$type<Record<string, string>>().notNull().default({}),
  keepBackground: boolean('keep_background').notNull().default(true),
  /** Speech-free background track, mixed under the new voices. */
  backgroundKey: text('background_key'),
  /** The job that is working on this project now, if any. */
  jobId: text('job_id'),
  error: text('error'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('dub_workspace_idx').on(t.workspaceId)])

export const studioProject = pgTable('studio_project', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  kind: text('kind', { enum: ['audiobook', 'podcast'] }).notNull().default('audiobook'),
  defaultVoiceId: text('default_voice_id').references(() => voice.id, { onDelete: 'set null' }),
  /** Speaker name → voice id. */
  cast: jsonb('cast').$type<Record<string, string>>().notNull().default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('studio_workspace_idx').on(t.workspaceId)])

export const studioChapter = pgTable('studio_chapter', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => studioProject.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  title: text('title').notNull(),
  createdAt: createdAt(),
}, (t) => [index('chapter_project_idx').on(t.projectId, t.position)])

export const studioBlock = pgTable('studio_block', {
  id: text('id').primaryKey(),
  chapterId: text('chapter_id').notNull().references(() => studioChapter.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  text: text('text').notNull(),
  speaker: text('speaker'),
  voiceId: text('voice_id').references(() => voice.id, { onDelete: 'set null' }),
  /** Rendered audio for this block, reused until the text or voice changes. */
  audioKey: text('audio_key'),
  audioHash: text('audio_hash'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('block_chapter_idx').on(t.chapterId, t.position)])

/* ------------------------------------------------------------------ Developers */

export { API_SCOPES, WEBHOOK_EVENTS, type ApiScope }

export const apiKey = pgTable('api_key', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  /** First characters, shown in the UI to tell keys apart. */
  prefix: text('prefix').notNull(),
  /** sha256 of the full key; the key itself is shown once and never stored. */
  hash: text('hash').notNull().unique(),
  scopes: text('scopes').array().notNull(),
  rateLimitPerMinute: integer('rate_limit_per_minute').notNull().default(60),
  /** Optional monthly credit cap for this key; null = workspace limit only. */
  creditLimit: integer('credit_limit'),
  lastUsedAt: ts('last_used_at'),
  revokedAt: ts('revoked_at'),
  createdAt: createdAt(),
}, (t) => [index('apikey_workspace_idx').on(t.workspaceId)])


export const webhook = pgTable('webhook', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  /** Signing secret, encrypted at rest with APP_ENCRYPTION_KEY. */
  secretEnc: text('secret_enc').notNull(),
  events: text('events').array().notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
}, (t) => [index('webhook_workspace_idx').on(t.workspaceId)])

export const webhookDelivery = pgTable('webhook_delivery', {
  id: text('id').primaryKey(),
  webhookId: text('webhook_id').notNull().references(() => webhook.id, { onDelete: 'cascade' }),
  event: text('event').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  status: text('status', { enum: ['pending', 'delivered', 'failed'] }).notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  responseCode: integer('response_code'),
  nextAttemptAt: ts('next_attempt_at'),
  createdAt: createdAt(),
}, (t) => [index('delivery_webhook_idx').on(t.webhookId, t.createdAt)])

/* ------------------------------------------------------------------ Account, safety, audit */

export const notification = pgTable('notification', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  href: text('href'),
  readAt: ts('read_at'),
  createdAt: createdAt(),
}, (t) => [index('notification_user_idx').on(t.userId, t.createdAt)])

export const notificationPref = pgTable('notification_pref', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  jobEmails: boolean('job_emails').notNull().default(true),
  billingEmails: boolean('billing_emails').notNull().default(true),
  productEmails: boolean('product_emails').notNull().default(false),
  lowCreditEmails: boolean('low_credit_emails').notNull().default(true),
})

export const abuseReport = pgTable('abuse_report', {
  id: text('id').primaryKey(),
  reporterUserId: text('reporter_user_id').references(() => user.id, { onDelete: 'set null' }),
  reporterEmail: text('reporter_email'),
  targetType: text('target_type', { enum: ['voice', 'generation', 'user'] }).notNull(),
  targetId: text('target_id').notNull(),
  reason: text('reason').notNull(),
  details: text('details').notNull().default(''),
  status: text('status', { enum: ['open', 'actioned', 'dismissed'] }).notNull().default('open'),
  createdAt: createdAt(),
}, (t) => [index('report_status_idx').on(t.status, t.createdAt)])

/** Append-only (an update/delete trigger in the migration rejects changes). */
export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey(),
  actorId: text('actor_id'),
  actorRole: text('actor_role'),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  before: jsonb('before'),
  after: jsonb('after'),
  reason: text('reason'),
  ipAddress: text('ip_address'),
  createdAt: createdAt(),
}, (t) => [index('audit_time_idx').on(t.createdAt), index('audit_target_idx').on(t.targetType, t.targetId)])

export const dataExport = pgTable('data_export', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  jobId: text('job_id').references(() => job.id, { onDelete: 'set null' }),
  storageKey: text('storage_key'),
  expiresAt: ts('expires_at'),
  createdAt: createdAt(),
})

/** Direct-to-storage uploads. The browser PUTs to a signed URL; the API then refers to the upload by id. */
export const UPLOAD_PURPOSES = ['voice_sample', 'consent', 'media'] as const
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number]
export const upload = pgTable('upload', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  purpose: text('purpose', { enum: UPLOAD_PURPOSES }).notNull(),
  storageKey: text('storage_key').notNull(),
  filename: text('filename').notNull(),
  declaredType: text('declared_type').notNull(),
  /** The type sniffed from the bytes after upload; null until completed. */
  mime: text('mime'),
  maxBytes: bigint('max_bytes', { mode: 'number' }).notNull(),
  bytes: bigint('bytes', { mode: 'number' }),
  status: text('status', { enum: ['pending', 'ready', 'used'] }).notNull().default('pending'),
  createdAt: createdAt(),
}, (t) => [index('upload_workspace_idx').on(t.workspaceId, t.createdAt)])

/* ------------------------------------------------------------------ Admin console (Phase 5) */

/**
 * One row per browser session that has opened the admin console. Drives the 15-minute idle
 * lock and the "re-enter your password" check before destructive actions.
 */
export const adminSession = pgTable('admin_session', {
  sessionId: text('session_id').primaryKey().references(() => session.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  lastSeenAt: ts('last_seen_at').notNull().defaultNow(),
  /** Last successful re-authentication (password, plus a 2FA code when enabled). */
  reauthAt: ts('reauth_at'),
  ipAddress: text('ip_address'),
  createdAt: createdAt(),
}, (t) => [index('admin_session_user_idx').on(t.userId)])

/** Small site-wide settings edited in the admin console: announcement banner, maintenance mode, setup state. */
export const systemSetting = pgTable('system_setting', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<Record<string, unknown>>().notNull(),
  updatedBy: text('updated_by'),
  updatedAt: updatedAt(),
})

/**
 * Product switches (src/config/flags.ts). Off: nobody but the listed users. On: everyone, or only
 * the listed plans when `plans` is not empty; the listed users always have it.
 */
export const featureFlag = pgTable('feature_flag', {
  key: text('key').primaryKey(),
  enabled: boolean('enabled').notNull().default(true),
  plans: text('plans').array().notNull().default(sql`'{}'::text[]`),
  userIds: text('user_ids').array().notNull().default(sql`'{}'::text[]`),
  updatedBy: text('updated_by'),
  updatedAt: updatedAt(),
})

/** Admin edits to a plan, on top of the defaults in src/config/plans.ts. Null = keep the default. */
export const planSetting = pgTable('plan_setting', {
  planId: text('plan_id', { enum: PLAN_IDS }).primaryKey(),
  /** Per currency, minor units: { USD: { monthly, annualPerMonth } }. */
  prices: jsonb('prices').$type<Record<string, { monthly: number; annualPerMonth: number }>>(),
  creditsPerMonth: integer('credits_per_month'),
  seats: integer('seats'),
  customVoices: integer('custom_voices'),
  professionalClones: integer('professional_clones'),
  mixerSources: integer('mixer_sources'),
  updatedBy: text('updated_by'),
  updatedAt: updatedAt(),
})
