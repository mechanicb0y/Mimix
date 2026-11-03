import 'server-only'
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { env } from '@/server/env'

/** AES-256-GCM with APP_ENCRYPTION_KEY (32 bytes, base64). Output: v1.<iv>.<tag>.<ciphertext>, base64url. */
function key(): Buffer {
  const k = Buffer.from(env().APP_ENCRYPTION_KEY, 'base64')
  if (k.length !== 32) throw new Error('APP_ENCRYPTION_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)')
  return k
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), enc.toString('base64url')].join('.')
}

export function decryptSecret(stored: string): string {
  const [v, iv, tag, enc] = stored.split('.')
  if (v !== 'v1' || !iv || !tag || !enc) throw new Error('Unknown secret format')
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  d.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([d.update(Buffer.from(enc, 'base64url')), d.final()]).toString('utf8')
}

/**
 * Webhook signature, in the header `Mimix-Signature: t=<unix seconds>,v1=<hex>` where
 * v1 = HMAC-SHA256(secret, "<t>.<raw body>"). Receivers should reject timestamps older than 5 minutes.
 */
export function signWebhook(secret: string, body: string, t = Math.floor(Date.now() / 1000)): string {
  return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`
}

export function verifyWebhook(secret: string, body: string, header: string, toleranceSeconds = 300, now = Math.floor(Date.now() / 1000)): boolean {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]))
  const t = Number(parts.t)
  if (!Number.isFinite(t) || Math.abs(now - t) > toleranceSeconds || !parts.v1) return false
  const expected = Buffer.from(createHmac('sha256', secret).update(`${t}.${body}`).digest('hex'))
  const got = Buffer.from(parts.v1)
  return expected.length === got.length && timingSafeEqual(expected, got)
}
