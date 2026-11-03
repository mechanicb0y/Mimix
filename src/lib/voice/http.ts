import { getMessages } from '@/i18n'
import { EngineError } from './types'

/** User-safe engine error copy (errors.app.engine). */
export const engineCopy = () => getMessages('en').errors.app.engine

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/**
 * fetch for engine adapters: a timeout, and provider failures turned into EngineError with copy a
 * user can read. The provider's own message goes to the server log only, never to the user.
 * 429 and 5xx are retryable (the job queue tries again); other 4xx are not.
 */
export async function engineFetch(fetchImpl: FetchLike, provider: string, url: string, init: RequestInit, timeoutMs = 60_000): Promise<Response> {
  let res: Response
  try {
    res = await fetchImpl(url, { ...init, signal: init.signal ?? AbortSignal.timeout(timeoutMs) })
  } catch (err) {
    console.error(`[${provider}] request failed`, url, (err as Error).message)
    throw new EngineError(engineCopy().unavailable, true, 503)
  }
  if (res.ok) return res
  const detail = await res.text().catch(() => '')
  console.error(`[${provider}] ${res.status}`, url, detail.slice(0, 500))
  const c = engineCopy()
  if (res.status === 429) throw new EngineError(c.busy, true, 429)
  if (res.status >= 500) throw new EngineError(c.unavailable, true, res.status)
  if (res.status === 401 || res.status === 403) throw new EngineError(c.unavailable, false, res.status)
  throw new EngineError(c.rejected, false, res.status)
}

export function toBase64(bytes: Uint8Array): string { return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64') }
export function fromBase64(s: string): Uint8Array { return new Uint8Array(Buffer.from(s, 'base64')) }

/**
 * Splits text into pieces of at most `max` UTF-16 units, at sentence ends where possible, then at
 * spaces, and only as a last resort mid-word. Pieces keep their own punctuation.
 */
export function splitText(text: string, max: number): string[] {
  const t = text.trim()
  if (t.length <= max) return t ? [t] : []
  const sentences = t.match(/[^.!?。！？\n]+[.!?。！？]*[\s\n]*|[\s\n]+/g) ?? [t]
  const out: string[] = []
  let cur = ''
  const flush = () => { if (cur.trim()) out.push(cur.trim()); cur = '' }
  for (const s of sentences) {
    if ((cur + s).length <= max) { cur += s; continue }
    flush()
    if (s.length <= max) { cur = s; continue }
    for (const w of s.split(/(\s+)/)) {
      if ((cur + w).length <= max) { cur += w; continue }
      flush()
      let rest = w
      while (rest.length > max) { out.push(rest.slice(0, max)); rest = rest.slice(max) }
      cur = rest
    }
  }
  flush()
  return out
}

/** Lines of an NDJSON response body, as they arrive. */
export async function* ndjsonLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      let nl: number
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim()
        buf = buf.slice(nl + 1)
        if (line) yield line
      }
    }
    const last = (buf + dec.decode()).trim()
    if (last) yield last
  } finally {
    reader.releaseLock()
  }
}
