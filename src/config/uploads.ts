/**
 * Upload limits per purpose. These are Mimix's own limits (storage and processing cost), not
 * engine limits. Types are checked again on the server from the bytes, never from the name.
 */
import type { UploadPurpose } from '@/server/db/schema'

const MB = 1024 * 1024

export const UPLOAD_LIMITS: Record<UploadPurpose, { maxBytes: number; accept: string[]; extensions: string[] }> = {
  voice_sample: { maxBytes: 200 * MB, accept: ['audio/', 'video/mp4', 'video/webm', 'video/quicktime'], extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'webm', 'flac', 'mp4', 'mov'] },
  consent: { maxBytes: 20 * MB, accept: ['audio/', 'video/webm'], extensions: ['mp3', 'wav', 'm4a', 'ogg', 'opus', 'webm', 'flac'] },
  media: { maxBytes: 2048 * MB, accept: ['audio/', 'video/'], extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'webm', 'flac', 'mp4', 'mov', 'mkv'] },
}

/** Hard cap for any single upload. */
export const MAX_UPLOAD_BYTES = 2048 * MB

/** Uploads never used are deleted after this long. */
export const UPLOAD_TTL_HOURS = 24

export function formatBytes(n: number): string {
  return n >= 1024 * MB ? `${Math.round(n / (1024 * MB))} GB` : `${Math.round(n / MB)} MB`
}
