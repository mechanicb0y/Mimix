/** Shared by the server, the API docs and the app (no server imports here). */
export const API_SCOPES = ['tts', 'voices:read', 'voices:write', 'stt', 'sfx', 'isolator', 'changer', 'dubbing', 'studio', 'usage:read'] as const
export type ApiScope = (typeof API_SCOPES)[number]

export const WEBHOOK_EVENTS = ['job.succeeded', 'job.failed', 'voice.ready', 'voice.taken_down', 'credits.low'] as const
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]
