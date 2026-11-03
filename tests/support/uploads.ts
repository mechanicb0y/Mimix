import { POST as createUpload } from '@/app/api/v1/uploads/route'
import { POST as completeUpload } from '@/app/api/v1/uploads/[id]/complete/route'
import { PUT as putMedia } from '@/app/api/media/[...key]/route'
import { call } from './fixtures'

/** Uploads bytes the way the browser does: create → PUT to the signed URL → complete. */
export async function uploadFile(key: string, bytes: Uint8Array, opts: { purpose: 'voice_sample' | 'consent' | 'media'; filename?: string; contentType?: string }) {
  const filename = opts.filename ?? 'sample.wav'
  const contentType = opts.contentType ?? 'audio/wav'
  const c = await call(createUpload, { key, json: { purpose: opts.purpose, filename, contentType, bytes: bytes.byteLength } })
  if (c.status !== 201) return { status: c.status, data: c.data, id: null as string | null }
  const url = new URL(c.data.url)
  const put = await putMedia(new Request(url, { method: 'PUT', headers: c.data.headers, body: Buffer.from(bytes) }), { params: Promise.resolve({ key: url.pathname.replace('/api/media/', '').split('/') }) })
  if (put.status !== 200) return { status: put.status, data: null, id: null }
  const done = await call(completeUpload, { key, method: 'POST', params: { id: c.data.id } })
  return { status: done.status, data: done.data, id: done.status === 200 ? (c.data.id as string) : null }
}
