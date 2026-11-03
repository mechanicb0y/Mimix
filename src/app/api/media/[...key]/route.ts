import { env } from '@/server/env'
import { timingSafeEqual } from 'node:crypto'
import { getStorage, localContentType, signLocalUpload, verifyLocalSignature } from '@/server/storage'
import { MAX_UPLOAD_BYTES } from '@/config/uploads'

export const dynamic = 'force-dynamic'

/**
 * Serves local-storage files behind signed, expiring URLs (STORAGE_DRIVER=local only; S3 URLs go
 * straight to the bucket). Supports Range requests so audio can seek.
 */
export async function GET(req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  if (env().STORAGE_DRIVER !== 'local') return new Response('Not found', { status: 404 })
  const key = (await ctx.params).key.join('/')
  const url = new URL(req.url)
  const expires = Number(url.searchParams.get('e'))
  const dl = url.searchParams.get('dl') ?? ''
  if (!verifyLocalSignature(key, expires, dl, url.searchParams.get('s') ?? '')) return new Response('This link has expired.', { status: 403 })
  const body = await (await getStorage()).get(key)
  if (!body) return new Response('Not found', { status: 404 })
  const type = await localContentType(key)
  const headers = new Headers({
    'Content-Type': type, 'Accept-Ranges': 'bytes',
    // Private, but cacheable by URL until it expires (the signature is part of the URL).
    'Cache-Control': `private, max-age=${Math.max(0, expires - Math.floor(Date.now() / 1000))}`,
    'X-Content-Type-Options': 'nosniff',
  })
  if (dl) headers.set('Content-Disposition', `attachment; filename="${dl.replace(/["\\\r\n]/g, '')}"`)
  const range = req.headers.get('range')?.match(/^bytes=(\d*)-(\d*)$/)
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, body.length - Number(range[2]))
    const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1
    if (start >= body.length || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${body.length}` } })
    headers.set('Content-Range', `bytes ${start}-${end}/${body.length}`)
    headers.set('Content-Length', String(end - start + 1))
    return new Response(Buffer.from(body.subarray(start, end + 1)), { status: 206, headers })
  }
  headers.set('Content-Length', String(body.length))
  return new Response(Buffer.from(body), { headers })
}

/**
 * Receives a direct upload (local storage only; S3 uploads go straight to the bucket). The URL comes
 * from POST /api/v1/uploads and is bound to the key, expiry and content type. Size is capped while
 * streaming; the upload's own limit is checked again when the client completes it.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  if (env().STORAGE_DRIVER !== 'local') return new Response('Not found', { status: 404 })
  const key = (await ctx.params).key.join('/')
  const url = new URL(req.url)
  const expires = Number(url.searchParams.get('e'))
  const type = req.headers.get('content-type') ?? ''
  const given = Buffer.from(url.searchParams.get('u') ?? '')
  const expected = Buffer.from(signLocalUpload(key, expires, type))
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000) || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response('This upload link has expired.', { status: 403 })
  }
  if (!req.body) return new Response('Empty upload', { status: 400 })
  const chunks: Uint8Array[] = []
  let size = 0
  const reader = req.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_UPLOAD_BYTES) { await reader.cancel(); return new Response('File too large', { status: 413 }) }
    chunks.push(value)
  }
  const body = new Uint8Array(size)
  let off = 0
  for (const c of chunks) { body.set(c, off); off += c.byteLength }
  await (await getStorage()).put(key, body, type || 'application/octet-stream')
  return new Response(null, { status: 200 })
}
