'use client'
/**
 * Browser helper for our JSON API. Throws ApiClientError with the server's code, message and
 * field errors, so forms can show them next to the right input.
 */
import { getMessages } from '@/i18n'

export class ApiClientError extends Error {
  constructor(public status: number, public code: string, message: string, public fields: Record<string, string> = {}, public extra: Record<string, unknown> = {}) { super(message); this.name = 'ApiClientError' }
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init
  let res: Response
  try {
    res = await fetch(path, { ...rest, headers: { ...(json !== undefined ? { 'content-type': 'application/json' } : {}), ...rest.headers }, body: json !== undefined ? JSON.stringify(json) : rest.body })
  } catch {
    throw new ApiClientError(0, 'network', getMessages().app.common.networkError)
  }
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const e = data?.error ?? {}
    const { code, message, fields, ...extra } = e
    throw new ApiClientError(res.status, code ?? 'error', message ?? getMessages().errors.app.server, fields ?? {}, extra)
  }
  return data as T
}

/** Follows a job over Server-Sent Events until it finishes. Returns an unsubscribe function. */
export function followJob(jobId: string, onUpdate: (job: JobState) => void): () => void {
  let es: EventSource | null = null
  let stopped = false
  let retries = 0
  const open = () => {
    es = new EventSource(`/api/v1/jobs/${jobId}/events`)
    const handle = (ev: MessageEvent) => { retries = 0; onUpdate(JSON.parse(ev.data)) }
    es.addEventListener('progress', handle)
    es.addEventListener('done', (ev) => { handle(ev as MessageEvent); stop() })
    es.onerror = () => {
      es?.close()
      if (!stopped && retries++ < 8) setTimeout(open, Math.min(8000, 500 * 2 ** retries))
    }
  }
  const stop = () => { stopped = true; es?.close() }
  open()
  return stop
}

export interface JobState { id: string; type: string; status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'; progress: number; message: string | null; output: Record<string, unknown> | null; error: string | null }
