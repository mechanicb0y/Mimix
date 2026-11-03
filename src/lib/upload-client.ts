'use client'
/**
 * Browser side of direct uploads: ask the API for a signed URL, PUT the file there with progress,
 * then confirm. Large files never pass through our API servers.
 */
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages } from '@/i18n'

export type UploadPurpose = 'voice_sample' | 'consent' | 'media'
export interface UploadedFile { id: string; filename: string; bytes: number; mime: string }

export async function uploadFile(file: Blob & { name?: string }, purpose: UploadPurpose, opts: { filename?: string; onProgress?: (fraction: number) => void; signal?: AbortSignal } = {}): Promise<UploadedFile> {
  const filename = opts.filename ?? file.name ?? 'recording.webm'
  const target = await api<{ id: string; url: string; method: 'PUT'; headers: Record<string, string> }>('/api/v1/uploads', {
    method: 'POST', json: { purpose, filename, contentType: file.type || 'application/octet-stream', bytes: file.size },
  })
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(target.method, target.url)
    for (const [k, v] of Object.entries(target.headers)) xhr.setRequestHeader(k, v)
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) opts.onProgress?.(e.loaded / e.total) }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new ApiClientError(xhr.status, xhr.status === 413 ? 'file_too_large' : 'upload_failed', getMessages().errors.app.uploadMissing)))
    xhr.onerror = () => reject(new ApiClientError(0, 'network', getMessages().app.common.networkError))
    opts.signal?.addEventListener('abort', () => { xhr.abort(); reject(new DOMException('Aborted', 'AbortError')) })
    xhr.send(file)
  })
  opts.onProgress?.(1)
  const done = await api<{ id: string; filename: string; bytes: number; mime: string }>(`/api/v1/uploads/${target.id}/complete`, { method: 'POST' })
  return done
}
