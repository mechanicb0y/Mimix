import 'server-only'
import { z } from '@/lib/zod'
import { API_SCOPES, WEBHOOK_EVENTS, type ApiScope } from '@/config/api'
import { sttSchema, transcriptPatchSchema, sfxSchema, isolatorSchema } from '@/lib/schemas/audio-tools'
import { changerSchema } from '@/lib/schemas/changer'
import { createCloneSchema, consentSchema } from '@/lib/schemas/clone'
import { designSchema, designSaveSchema } from '@/lib/schemas/design'
import { keyCreateSchema, keyPatchSchema, webhookCreateSchema, webhookPatchSchema } from '@/lib/schemas/developers'
import { dubCreateSchema, dubPatchSchema, dubRenderSchema } from '@/lib/schemas/dubbing'
import { mixSourcesSchema, mixSaveSchema } from '@/lib/schemas/mixer'
import { studioCreateSchema, studioPatchSchema, studioImportSchema, chapterCreateSchema, chapterPatchSchema, blockCreateSchema, blockPatchSchema, studioExportSchema } from '@/lib/schemas/studio'
import { ttsSchema, pronunciationRuleSchema } from '@/lib/schemas/tts'
import { createUploadSchema } from '@/lib/schemas/uploads'
import { voicePatchSchema } from '@/lib/schemas/voices'
import { acceptInviteSchema, cancelSchema, checkoutSchema, deleteAccountSchema, inviteSchema, notificationPrefsSchema, roleSchema, topUpSchema, workspacePatchSchema } from '@/lib/schemas/account'

/**
 * The OpenAPI 3.1 document for /api/v1, served at /api/v1/openapi.json. Request bodies come from
 * the same zod schemas the handlers validate with, so the spec can't drift from the code; a test
 * checks that every route file is listed here.
 */
type Method = 'get' | 'post' | 'patch' | 'delete'
interface Op {
  method: Method; path: string; summary: string; tag: string
  /** API-key scope; null = signed in to the app only (keys, webhooks, account); 'any' = every key. */
  scope: ApiScope | 'any' | null
  body?: z.ZodType; query?: Record<string, { type: string; description: string; enum?: readonly string[] }>
  ok?: number; accepted?: boolean; binary?: string
}

const id = (name = 'id') => ({ name, in: 'path', required: true, schema: { type: 'string' } })
const list = { before: { type: 'string', description: 'ISO time; returns items created before it (use nextBefore from the last page).' }, limit: { type: 'integer', description: '1 to 100.' } }

export const OPERATIONS: Op[] = [
  // Speech
  { method: 'post', path: '/text-to-speech', tag: 'Speech', scope: 'tts', summary: 'Generate speech (one take, up to the per-take limit). Returns the generation with audio URLs.', body: ttsSchema, ok: 201 },
  { method: 'post', path: '/text-to-speech/async', tag: 'Speech', scope: 'tts', summary: 'Generate speech as a job (202). Follow it at /jobs/{id}; when it succeeds, output.generationId is the take in /history.', body: ttsSchema, ok: 202 },
  { method: 'post', path: '/text-to-speech/stream', tag: 'Speech', scope: 'tts', summary: 'Stream speech as it is made (chunked MP3).', body: ttsSchema, binary: 'audio/mpeg' },
  { method: 'get', path: '/models', tag: 'Speech', scope: 'any', summary: 'Models of the active engine.' },
  { method: 'get', path: '/pronunciation', tag: 'Speech', scope: 'tts', summary: 'Pronunciation dictionary.' },
  { method: 'post', path: '/pronunciation', tag: 'Speech', scope: 'tts', summary: 'Add or replace a pronunciation rule.', body: pronunciationRuleSchema, ok: 201 },
  { method: 'delete', path: '/pronunciation/{id}', tag: 'Speech', scope: 'tts', summary: 'Delete a pronunciation rule.', ok: 204 },
  { method: 'get', path: '/history', tag: 'Speech', scope: 'any', summary: 'Generations, newest first.', query: { ...list, module: { type: 'string', description: 'Filter by product, e.g. tts, sfx, changer.' } } },
  { method: 'get', path: '/history/{id}', tag: 'Speech', scope: 'any', summary: 'One generation with fresh signed URLs.' },
  { method: 'delete', path: '/history/{id}', tag: 'Speech', scope: 'any', summary: 'Delete a generation and its audio.', ok: 204 },
  // Voices
  { method: 'get', path: '/voices', tag: 'Voices', scope: 'voices:read', summary: 'Voices this workspace can use.' },
  { method: 'get', path: '/library', tag: 'Voices', scope: 'voices:read', summary: 'Search the Voice Library.', query: { q: { type: 'string', description: 'Search text.' }, language: { type: 'string', description: 'ISO 639-1.' }, page: { type: 'integer', description: 'From 1.' } } },
  { method: 'get', path: '/voices/{id}', tag: 'Voices', scope: 'voices:read', summary: 'One voice, with its lineage.' },
  { method: 'patch', path: '/voices/{id}', tag: 'Voices', scope: 'voices:write', summary: 'Edit a voice you own.', body: voicePatchSchema },
  { method: 'delete', path: '/voices/{id}', tag: 'Voices', scope: 'voices:write', summary: 'Delete a voice you own (and remove it from the engine).', ok: 204 },
  { method: 'get', path: '/voices/{id}/preview', tag: 'Voices', scope: 'voices:read', summary: 'Preview audio for a voice.', binary: 'audio/mpeg' },
  { method: 'post', path: '/voices/{id}/save', tag: 'Voices', scope: 'voices:write', summary: 'Save a library voice to My voices.' },
  { method: 'delete', path: '/voices/{id}/save', tag: 'Voices', scope: 'voices:write', summary: 'Remove a saved library voice.', ok: 204 },
  { method: 'post', path: '/voices/{id}/publish', tag: 'Voices', scope: 'voices:write', summary: 'Ask to publish a voice to the library (moderated).', accepted: true },
  { method: 'delete', path: '/voices/{id}/publish', tag: 'Voices', scope: 'voices:write', summary: 'Unpublish a voice.' },
  { method: 'post', path: '/voices/mix/preview', tag: 'Voices', scope: 'voices:write', summary: 'Preview a mix of 2 or 3 voices on a fixed sentence.', body: mixSourcesSchema, binary: 'audio/mpeg' },
  { method: 'post', path: '/voices/mix', tag: 'Voices', scope: 'voices:write', summary: 'Save a mix as a voice, with lineage and the most restrictive licence.', body: mixSourcesSchema.and(mixSaveSchema), ok: 201 },
  { method: 'post', path: '/voices/design', tag: 'Voices', scope: 'voices:write', summary: 'Design three voices from a description.', body: designSchema, ok: 201 },
  { method: 'post', path: '/voices/design/save', tag: 'Voices', scope: 'voices:write', summary: 'Save one designed voice.', body: designSaveSchema, ok: 201 },
  { method: 'post', path: '/voices/clone', tag: 'Voices', scope: 'voices:write', summary: 'Start a clone from uploaded samples; the speaker then verifies consent (or, where the site takes consent by confirmation, the voice switches on when the job finishes).', body: createCloneSchema, accepted: true },
  { method: 'post', path: '/voices/{id}/consent/phrase', tag: 'Voices', scope: 'voices:write', summary: 'Get a consent phrase for the speaker to read (valid 10 minutes).', ok: 201 },
  { method: 'post', path: '/voices/{id}/consent', tag: 'Voices', scope: 'voices:write', summary: 'Verify the consent recording (speaker match and phrase), or, where the site takes consent by confirmation, send { attest: true }.', body: consentSchema },
  { method: 'get', path: '/voices/{id}/consent', tag: 'Voices', scope: 'voices:read', summary: 'Consent records for a voice.' },
  // Audio
  { method: 'post', path: '/uploads', tag: 'Files', scope: 'any', summary: 'Create an upload and get a signed URL to PUT the file to.', body: createUploadSchema, ok: 201 },
  { method: 'post', path: '/uploads/{id}/complete', tag: 'Files', scope: 'any', summary: 'Confirm an upload; checks size and file type.' },
  { method: 'post', path: '/speech-to-text', tag: 'Audio', scope: 'stt', summary: 'Transcribe an upload with timestamps and speakers.', body: sttSchema, accepted: true },
  { method: 'get', path: '/transcripts', tag: 'Audio', scope: 'stt', summary: 'Transcripts, newest first.', query: list },
  { method: 'get', path: '/transcripts/{id}', tag: 'Audio', scope: 'stt', summary: 'A transcript as JSON, or a TXT/SRT/VTT file.', query: { format: { type: 'string', enum: ['json', 'txt', 'srt', 'vtt'], description: 'Default json.' }, timestamps: { type: 'string', description: '1 adds times to TXT.' }, speakers: { type: 'string', description: '0 leaves speaker names out.' } } },
  { method: 'patch', path: '/transcripts/{id}', tag: 'Audio', scope: 'stt', summary: 'Rename a transcript or its speakers.', body: transcriptPatchSchema },
  { method: 'delete', path: '/transcripts/{id}', tag: 'Audio', scope: 'stt', summary: 'Delete a transcript and its audio.', ok: 204 },
  { method: 'post', path: '/sound-effects', tag: 'Audio', scope: 'sfx', summary: 'Generate a sound effect from a prompt.', body: sfxSchema, ok: 201 },
  { method: 'post', path: '/voice-isolator', tag: 'Audio', scope: 'isolator', summary: 'Remove background noise and music from an upload.', body: isolatorSchema, accepted: true },
  { method: 'post', path: '/voice-changer', tag: 'Audio', scope: 'changer', summary: 'Re-voice a recording with one of your voices.', body: changerSchema, accepted: true },
  // Dubbing
  { method: 'get', path: '/dubbing', tag: 'Dubbing', scope: 'dubbing', summary: 'Dubbing projects, newest first.', query: list },
  { method: 'post', path: '/dubbing', tag: 'Dubbing', scope: 'dubbing', summary: 'Dub an uploaded audio or video file into up to 5 languages.', body: dubCreateSchema, accepted: true },
  { method: 'get', path: '/dubbing/{id}', tag: 'Dubbing', scope: 'dubbing', summary: 'A project with lines, cast and files per language.' },
  { method: 'patch', path: '/dubbing/{id}', tag: 'Dubbing', scope: 'dubbing', summary: 'Rename, recast, or replace one language’s lines.', body: dubPatchSchema },
  { method: 'delete', path: '/dubbing/{id}', tag: 'Dubbing', scope: 'dubbing', summary: 'Delete a project and its files.', ok: 204 },
  { method: 'post', path: '/dubbing/{id}/render', tag: 'Dubbing', scope: 'dubbing', summary: 'Re-voice one language after edits (charges changed lines only).', body: dubRenderSchema, accepted: true },
  { method: 'get', path: '/dubbing/{id}/captions', tag: 'Dubbing', scope: 'dubbing', summary: 'SRT or VTT captions for the source or a language.', query: { language: { type: 'string', description: '"source" or a language code.' }, format: { type: 'string', enum: ['srt', 'vtt'], description: 'Default srt.' } } },
  // Studio
  { method: 'get', path: '/studio/projects', tag: 'Studio', scope: 'studio', summary: 'Studio projects.' },
  { method: 'post', path: '/studio/projects', tag: 'Studio', scope: 'studio', summary: 'Create an audiobook or podcast project.', body: studioCreateSchema, ok: 201 },
  { method: 'get', path: '/studio/projects/{id}', tag: 'Studio', scope: 'studio', summary: 'A project with chapters, blocks and exports.' },
  { method: 'patch', path: '/studio/projects/{id}', tag: 'Studio', scope: 'studio', summary: 'Title, type, narrator voice and cast.', body: studioPatchSchema },
  { method: 'delete', path: '/studio/projects/{id}', tag: 'Studio', scope: 'studio', summary: 'Delete a project.', ok: 204 },
  { method: 'post', path: '/studio/projects/{id}/import', tag: 'Studio', scope: 'studio', summary: 'Import text or Markdown into chapters and blocks.', body: studioImportSchema },
  { method: 'post', path: '/studio/projects/{id}/chapters', tag: 'Studio', scope: 'studio', summary: 'Add a chapter.', body: chapterCreateSchema, ok: 201 },
  { method: 'post', path: '/studio/projects/{id}/export', tag: 'Studio', scope: 'studio', summary: 'Voice changed blocks and export mastered MP3s.', body: studioExportSchema, accepted: true },
  { method: 'patch', path: '/studio/chapters/{id}', tag: 'Studio', scope: 'studio', summary: 'Rename or move a chapter.', body: chapterPatchSchema },
  { method: 'delete', path: '/studio/chapters/{id}', tag: 'Studio', scope: 'studio', summary: 'Delete a chapter.' },
  { method: 'post', path: '/studio/blocks', tag: 'Studio', scope: 'studio', summary: 'Add a block.', body: blockCreateSchema, ok: 201 },
  { method: 'patch', path: '/studio/blocks/{id}', tag: 'Studio', scope: 'studio', summary: 'Edit a block’s text, speaker or voice.', body: blockPatchSchema },
  { method: 'delete', path: '/studio/blocks/{id}', tag: 'Studio', scope: 'studio', summary: 'Delete a block.', ok: 204 },
  { method: 'post', path: '/studio/blocks/{id}/generate', tag: 'Studio', scope: 'studio', summary: 'Voice one block now.' },
  // Jobs and account
  { method: 'get', path: '/jobs', tag: 'Jobs', scope: 'any', summary: 'Running jobs, newest first.', query: { recent: { type: 'string', description: '1 to include jobs that finished in the last 15 minutes.' }, type: { type: 'string', description: 'Comma-separated job types, e.g. stt,tts.' }, ref: { type: 'string', description: 'Only jobs for this project or voice id.' }, limit: { type: 'integer', description: 'Up to 50 (default 20).' } } },
  { method: 'get', path: '/jobs/{id}', tag: 'Jobs', scope: 'any', summary: 'Status and output of a long-running job.' },
  { method: 'delete', path: '/jobs/{id}', tag: 'Jobs', scope: 'any', summary: 'Cancel a queued or running job (credits are refunded).', ok: 204 },
  { method: 'get', path: '/jobs/{id}/events', tag: 'Jobs', scope: 'any', summary: 'Server-sent events with job progress until it finishes.', binary: 'text/event-stream' },
  { method: 'get', path: '/usage', tag: 'Account', scope: 'usage:read', summary: 'Credits and requests per day, product and key, plus the balance.', query: { from: { type: 'string', description: 'ISO date.' }, to: { type: 'string', description: 'ISO date.' }, apiKeyId: { type: 'string', description: 'One key only.' } } },
  { method: 'get', path: '/notifications', tag: 'Account', scope: null, summary: 'In-app notifications (signed in only).' },
  { method: 'post', path: '/notifications', tag: 'Account', scope: null, summary: 'Mark notifications as read (signed in only).' },
  { method: 'get', path: '/keys', tag: 'Developers', scope: null, summary: 'API keys (owners and admins, signed in).' },
  { method: 'post', path: '/keys', tag: 'Developers', scope: null, summary: 'Create an API key; the key is shown once.', body: keyCreateSchema, ok: 201 },
  { method: 'patch', path: '/keys/{id}', tag: 'Developers', scope: null, summary: 'Rename a key or set its monthly credit cap.', body: keyPatchSchema },
  { method: 'delete', path: '/keys/{id}', tag: 'Developers', scope: null, summary: 'Revoke a key.', ok: 204 },
  { method: 'get', path: '/webhooks', tag: 'Developers', scope: null, summary: 'Webhook endpoints.' },
  { method: 'post', path: '/webhooks', tag: 'Developers', scope: null, summary: 'Add an endpoint; the signing secret is shown once.', body: webhookCreateSchema, ok: 201 },
  { method: 'patch', path: '/webhooks/{id}', tag: 'Developers', scope: null, summary: 'Change URL, events or pause an endpoint.', body: webhookPatchSchema },
  { method: 'delete', path: '/webhooks/{id}', tag: 'Developers', scope: null, summary: 'Delete an endpoint.', ok: 204 },
  { method: 'post', path: '/webhooks/{id}/test', tag: 'Developers', scope: null, summary: 'Send a signed test event now.' },
  { method: 'post', path: '/webhooks/{id}/rotate', tag: 'Developers', scope: null, summary: 'Rotate the signing secret.' },
  { method: 'get', path: '/webhooks/{id}/deliveries', tag: 'Developers', scope: null, summary: 'Recent deliveries and response codes.' },
  { method: 'get', path: '/credits/ledger', tag: 'Developers', scope: 'usage:read', summary: 'Credit history, newest first.', query: { before: list.before } },
  // Account (signed in to the app only; API keys are refused)
  { method: 'get', path: '/account/notifications', tag: 'Account', scope: null, summary: 'Email preferences.' },
  { method: 'patch', path: '/account/notifications', tag: 'Account', scope: null, summary: 'Turn email types on or off.', body: notificationPrefsSchema },
  { method: 'get', path: '/account/exports', tag: 'Account', scope: null, summary: 'Recent data exports.' },
  { method: 'post', path: '/account/exports', tag: 'Account', scope: null, summary: 'Start a data export (one per 24 hours).', accepted: true },
  { method: 'get', path: '/account/exports/{id}/download', tag: 'Account', scope: null, summary: 'Redirect to the export ZIP (302).' },
  { method: 'get', path: '/account/deletion', tag: 'Account', scope: null, summary: 'Deletion status and blockers.' },
  { method: 'post', path: '/account/deletion', tag: 'Account', scope: null, summary: 'Schedule account deletion (30-day grace period).', body: deleteAccountSchema },
  { method: 'delete', path: '/account/deletion', tag: 'Account', scope: null, summary: 'Cancel a scheduled deletion.', ok: 204 },
  { method: 'patch', path: '/workspace', tag: 'Account', scope: null, summary: 'Rename the workspace.', body: workspacePatchSchema, ok: 204 },
  { method: 'get', path: '/team', tag: 'Account', scope: null, summary: 'Members, open invites and seats.' },
  { method: 'post', path: '/team/invites', tag: 'Account', scope: null, summary: 'Invite someone by email.', body: inviteSchema, ok: 201 },
  { method: 'delete', path: '/team/invites/{id}', tag: 'Account', scope: null, summary: 'Cancel an invite.', ok: 204 },
  { method: 'post', path: '/team/invites/accept', tag: 'Account', scope: null, summary: 'Accept an invite as the signed-in person.', body: acceptInviteSchema },
  { method: 'patch', path: '/team/members/{userId}', tag: 'Account', scope: null, summary: 'Change a member’s role.', body: roleSchema, ok: 204 },
  { method: 'delete', path: '/team/members/{userId}', tag: 'Account', scope: null, summary: 'Remove a member, or leave (your own id).', ok: 204 },
  { method: 'post', path: '/team/transfer', tag: 'Account', scope: null, summary: 'Transfer ownership to an admin.', body: z.object({ userId: z.string() }), ok: 204 },
  { method: 'get', path: '/billing', tag: 'Account', scope: null, summary: 'Plan, balance and invoices.' },
  { method: 'post', path: '/billing/checkout', tag: 'Account', scope: null, summary: 'Start Checkout, or change an existing plan.', body: checkoutSchema },
  { method: 'post', path: '/billing/top-up', tag: 'Account', scope: null, summary: 'Start Checkout for a credit pack.', body: topUpSchema },
  { method: 'post', path: '/billing/portal', tag: 'Account', scope: null, summary: 'Open the Stripe customer portal.' },
  { method: 'post', path: '/billing/cancel', tag: 'Account', scope: null, summary: 'Cancel at period end, or undo that.', body: cancelSchema, ok: 204 },
]

const errorSchema = {
  type: 'object', required: ['error'],
  properties: { error: { type: 'object', required: ['code', 'message'], properties: { code: { type: 'string' }, message: { type: 'string' }, fields: { type: 'object', additionalProperties: { type: 'string' } } }, additionalProperties: true } },
}

export function openApiDocument(serverUrl: string) {
  const paths: Record<string, Record<string, unknown>> = {}
  for (const op of OPERATIONS) {
    const params = [...(op.path.match(/\{(\w+)\}/g) ?? []).map((p) => id(p.slice(1, -1))), ...Object.entries(op.query ?? {}).map(([name, s]) => ({ name, in: 'query', required: false, description: s.description, schema: { type: s.type, ...(s.enum ? { enum: s.enum } : {}) } }))]
    const status = String(op.accepted ? 202 : op.ok ?? 200)
    const success = status === '204' ? { description: 'Done.' }
      : op.binary ? { description: 'File or stream.', content: { [op.binary]: { schema: { type: 'string', format: 'binary' } } } }
      : { description: op.accepted ? 'Accepted. Follow the job at /jobs/{id} or its events.' : 'OK', content: { 'application/json': { schema: { type: 'object' } } } }
    paths[op.path] ??= {}
    paths[op.path]![op.method] = {
      tags: [op.tag], summary: op.summary, operationId: `${op.method}${op.path.replace(/\{(\w+)\}/g, 'By_$1').replace(/[^a-zA-Z0-9]+(.)?/g, (_m, c: string | undefined) => (c ? c.toUpperCase() : ''))}`,
      ...(params.length ? { parameters: params } : {}),
      ...(op.body ? { requestBody: { required: true, content: { 'application/json': { schema: z.toJSONSchema(op.body, { io: 'input', unrepresentable: 'any' }) } } } } : {}),
      security: op.scope === null ? [{ session: [] }] : [{ bearer: [] }, { apiKey: [] }],
      ...(op.scope && op.scope !== 'any' ? { 'x-required-scope': op.scope } : {}),
      responses: {
        [status]: success,
        ...Object.fromEntries([['401', 'Missing or invalid key.'], ['402', 'Not enough credits.'], ['403', 'Missing scope, plan feature or permission.'], ['404', 'Not found.'], ['409', 'Conflict, e.g. the item is busy.'], ['422', 'Validation failed; see error.fields.'], ['429', 'Rate limited; see Retry-After.']]
          .map(([c, d]) => [c, { description: d, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }])),
      },
    }
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'Mimix API', version: '1.0.0',
      description: 'Speech, voices and audio. Authenticate with `Authorization: Bearer mmx_…` (or `x-api-key`). Keys carry scopes; each operation lists the one it needs in `x-required-scope`. Long jobs return 202 and a job id; webhooks are signed with `Mimix-Signature: t=…,v1=HMAC-SHA256(secret, "t.body")`.',
    },
    servers: [{ url: serverUrl }],
    tags: ['Speech', 'Voices', 'Files', 'Audio', 'Dubbing', 'Studio', 'Jobs', 'Account', 'Developers'].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: {
        bearer: { type: 'http', scheme: 'bearer', description: 'An API key: mmx_…' },
        apiKey: { type: 'apiKey', in: 'header', name: 'x-api-key' },
        session: { type: 'apiKey', in: 'cookie', name: 'better-auth.session_token', description: 'Signed-in browser session (dashboard only).' },
      },
      schemas: {
        Error: errorSchema,
        Scope: { type: 'string', enum: [...API_SCOPES] },
        WebhookEvent: { type: 'string', enum: [...WEBHOOK_EVENTS, 'ping'] },
      },
    },
  }
}
