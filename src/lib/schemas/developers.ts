import { z } from '@/lib/zod'
import { API_SCOPES, WEBHOOK_EVENTS } from '@/config/api'

export const KEY_NAME_MAX = 60
/** Per-key limit; the default and the ceiling (Production and Team get more with WORKSPACE overrides later). */
export const KEY_RATE_DEFAULT = 60
export const KEY_RATE_MAX = 600

export const keyCreateSchema = z.object({
  name: z.string({ error: 'nameRequired' }).trim().min(1, 'nameRequired').max(KEY_NAME_MAX, 'nameTooLong'),
  scopes: z.array(z.enum(API_SCOPES), { error: 'scopes' }).min(1, 'scopes').refine((s) => new Set(s).size === s.length, 'scopes'),
  /** Monthly credit cap for this key; omit for none. */
  creditLimit: z.number({ error: 'number' }).int('number').min(1, 'creditLimit').max(100_000_000, 'creditLimit').nullable().optional(),
  rateLimitPerMinute: z.number({ error: 'number' }).int('number').min(1, 'rateLimit').max(KEY_RATE_MAX, 'rateLimit').default(KEY_RATE_DEFAULT),
})
export const keyPatchSchema = z.object({
  name: z.string().trim().min(1, 'nameRequired').max(KEY_NAME_MAX, 'nameTooLong').optional(),
  creditLimit: z.number({ error: 'number' }).int('number').min(1, 'creditLimit').max(100_000_000, 'creditLimit').nullable().optional(),
})

const url = z.string({ error: 'url' }).trim().max(2000, 'url').refine((u) => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' } catch { return false } }, 'url')
export const webhookCreateSchema = z.object({
  url,
  events: z.array(z.enum(WEBHOOK_EVENTS), { error: 'events' }).min(1, 'events'),
})
export const webhookPatchSchema = z.object({
  url: url.optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS), { error: 'events' }).min(1, 'events').optional(),
  active: z.boolean().optional(),
})

export const usageQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  apiKeyId: z.string().max(64).optional(),
})
