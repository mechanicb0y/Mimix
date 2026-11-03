import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, normalize, sep } from 'node:path'
import { env } from '@/server/env'

/**
 * Private file storage. Nothing is public: every read goes through a short-lived signed URL.
 *   local  files under <MIMIX_DATA_DIR>/storage, served by /api/media with an HMAC signature
 *   s3     any S3-compatible bucket (Supabase Storage's S3 endpoint, Cloudflare R2, AWS), presigned
 * MEDIA_CDN_URL, when set, replaces the origin of signed URLs so a CDN can cache them by full URL.
 */
export interface Storage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>
  get(key: string): Promise<Uint8Array | null>
  delete(key: string): Promise<void>
  size(key: string): Promise<number | null>
  signedUrl(key: string, opts?: { expiresIn?: number; downloadName?: string }): Promise<string>
  /** A URL the browser can PUT one file to directly, so large uploads never pass through the API. */
  signedUploadUrl(key: string, opts: { contentType: string; expiresIn?: number }): Promise<{ url: string; method: 'PUT'; headers: Record<string, string> }>
}

export const UPLOAD_URL_TTL = 60 * 60

export const DEFAULT_URL_TTL = 60 * 15

/** Keys look like ws_x/gen_y/output.mp3: letters, digits and . _ - / only, no "..". */
export function assertKey(key: string): string {
  if (!/^[A-Za-z0-9._\-/]{1,512}$/.test(key) || key.includes('..') || key.startsWith('/')) throw new Error('Invalid storage key')
  return key
}

/* ------------------------------------------------------------------ local */

function localRoot() {
  const e = env()
  return e.STORAGE_LOCAL_DIR ?? join(e.MIMIX_DATA_DIR, 'storage')
}

function localPath(key: string) {
  const root = normalize(localRoot())
  const p = normalize(join(root, assertKey(key)))
  if (!p.startsWith(root + sep)) throw new Error('Invalid storage key')
  return p
}

export function signLocal(key: string, expires: number, downloadName = ''): string {
  return createHmac('sha256', env().STORAGE_SIGNING_KEY).update(`${key}\n${expires}\n${downloadName}`).digest('base64url')
}

export function verifyLocalSignature(key: string, expires: number, downloadName: string, sig: string): boolean {
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false
  const expected = Buffer.from(signLocal(key, expires, downloadName))
  const given = Buffer.from(sig)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

/** Upload signatures bind the key, expiry and content type, and can't be used to read. */
export function signLocalUpload(key: string, expires: number, contentType: string): string {
  return signLocal(key, expires, `upload:${contentType}`)
}

const localStorage: Storage = {
  async put(key, body, contentType) {
    const p = localPath(key)
    await mkdir(dirname(p), { recursive: true })
    await writeFile(p, body)
    await writeFile(`${p}.type`, contentType)
  },
  async get(key) {
    try { return new Uint8Array(await readFile(localPath(key))) } catch { return null }
  },
  async delete(key) {
    await rm(localPath(key), { force: true })
    await rm(`${localPath(key)}.type`, { force: true })
  },
  async size(key) {
    try { return (await stat(localPath(key))).size } catch { return null }
  },
  async signedUrl(key, opts = {}) {
    const expires = Math.floor(Date.now() / 1000) + (opts.expiresIn ?? DEFAULT_URL_TTL)
    const name = opts.downloadName ?? ''
    const qs = new URLSearchParams({ e: String(expires), s: signLocal(key, expires, name) })
    if (name) qs.set('dl', name)
    const base = env().MEDIA_CDN_URL ?? env().APP_URL
    return `${base}/api/media/${assertKey(key)}?${qs}`
  },
  async signedUploadUrl(key, opts) {
    const expires = Math.floor(Date.now() / 1000) + (opts.expiresIn ?? UPLOAD_URL_TTL)
    const qs = new URLSearchParams({ e: String(expires), u: signLocalUpload(key, expires, opts.contentType) })
    return { url: `${env().APP_URL}/api/media/${assertKey(key)}?${qs}`, method: 'PUT', headers: { 'Content-Type': opts.contentType } }
  },
}

export async function localContentType(key: string): Promise<string> {
  try { return (await readFile(`${localPath(key)}.type`, 'utf8')).trim() } catch { return 'application/octet-stream' }
}

/* ------------------------------------------------------------------ s3 */

async function s3Storage(): Promise<Storage> {
  const e = env()
  if (!e.S3_BUCKET || !e.S3_ACCESS_KEY_ID || !e.S3_SECRET_ACCESS_KEY) throw new Error('S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be set when STORAGE_DRIVER=s3')
  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3')
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
  const client = new S3Client({
    region: e.S3_REGION, endpoint: e.S3_ENDPOINT, forcePathStyle: !!e.S3_ENDPOINT,
    credentials: { accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY },
  })
  const Bucket = e.S3_BUCKET
  return {
    async put(key, body, contentType) { await client.send(new PutObjectCommand({ Bucket, Key: assertKey(key), Body: body, ContentType: contentType })) },
    async get(key) {
      try {
        const r = await client.send(new GetObjectCommand({ Bucket, Key: assertKey(key) }))
        return r.Body ? new Uint8Array(await r.Body.transformToByteArray()) : null
      } catch { return null }
    },
    async delete(key) { await client.send(new DeleteObjectCommand({ Bucket, Key: assertKey(key) })) },
    async size(key) {
      try { return (await client.send(new HeadObjectCommand({ Bucket, Key: assertKey(key) }))).ContentLength ?? null } catch { return null }
    },
    async signedUrl(key, opts = {}) {
      const url = await getSignedUrl(client, new GetObjectCommand({
        Bucket, Key: assertKey(key),
        ResponseContentDisposition: opts.downloadName ? `attachment; filename="${opts.downloadName.replace(/["\\]/g, '')}"` : undefined,
      }), { expiresIn: opts.expiresIn ?? DEFAULT_URL_TTL })
      if (!e.MEDIA_CDN_URL) return url
      const u = new URL(url)
      return `${e.MEDIA_CDN_URL}${u.pathname}${u.search}`
    },
    async signedUploadUrl(key, opts) {
      // The bucket needs a CORS rule allowing PUT from APP_URL (see the setup checklist).
      const url = await getSignedUrl(client, new PutObjectCommand({ Bucket, Key: assertKey(key), ContentType: opts.contentType }), { expiresIn: opts.expiresIn ?? UPLOAD_URL_TTL })
      return { url, method: 'PUT', headers: { 'Content-Type': opts.contentType } }
    },
  }
}

let cached: Promise<Storage> | undefined
export function getStorage(): Promise<Storage> {
  cached ??= env().STORAGE_DRIVER === 's3' ? s3Storage() : Promise.resolve(localStorage)
  return cached
}
