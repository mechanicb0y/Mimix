import 'server-only'
import { env } from '@/server/env'

/** Google sign-in shows only when its credentials are configured. */
export function googleEnabled(): boolean {
  const e = env()
  return !!(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET)
}

/** Only same-site paths are allowed as post-sign-in destinations. */
export function safeNext(next: string | string[] | undefined, fallback = '/app'): string {
  const n = Array.isArray(next) ? next[0] : next
  return n && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/\\') ? n : fallback
}
