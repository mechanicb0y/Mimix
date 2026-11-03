import 'server-only'
import { eq } from 'drizzle-orm'
import { z } from '@/lib/zod'
import { getDb, schema } from '@/server/db'

/** Site-wide settings kept in system_setting, each with its schema and default. */
export const SETTINGS = {
  announcement: z.object({
    active: z.boolean(),
    message: z.string().max(200),
    tone: z.enum(['info', 'warning']),
    /** Optional link for "Learn more" (a path on this site or https URL). */
    href: z.string().max(300).refine((v) => v === '' || v.startsWith('/') || v.startsWith('https://'), 'href').default(''),
  }),
  maintenance: z.object({
    active: z.boolean(),
    message: z.string().max(300),
  }),
  /** Set once the super-admin has used ADMIN_SETUP_TOKEN, so the token can't be used again. */
  adminSetup: z.object({ completedAt: z.string(), userId: z.string() }),
} as const
export type SettingKey = keyof typeof SETTINGS
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTINGS)[K]>

const DEFAULTS: { [K in SettingKey]: SettingValue<K> | null } = {
  announcement: { active: false, message: '', tone: 'info', href: '' },
  maintenance: { active: false, message: '' },
  adminSetup: null,
}

const TTL_MS = 10_000
const cache = new Map<SettingKey, { at: number; value: unknown }>()

export async function getSetting<K extends SettingKey>(key: K, fresh = false): Promise<SettingValue<K> | null> {
  const hit = cache.get(key)
  if (!fresh && hit && Date.now() - hit.at < TTL_MS) return hit.value as SettingValue<K> | null
  const [row] = await getDb().select().from(schema.systemSetting).where(eq(schema.systemSetting.key, key))
  const parsed = row ? SETTINGS[key].safeParse(row.value) : null
  const value = (parsed?.success ? parsed.data : DEFAULTS[key]) as SettingValue<K> | null
  cache.set(key, { at: Date.now(), value })
  return value
}

export async function setSetting<K extends SettingKey>(key: K, value: SettingValue<K>, updatedBy: string | null): Promise<void> {
  const v = SETTINGS[key].parse(value) as Record<string, unknown>
  await getDb().insert(schema.systemSetting).values({ key, value: v, updatedBy })
    .onConflictDoUpdate({ target: schema.systemSetting.key, set: { value: v, updatedBy, updatedAt: new Date() } })
  cache.delete(key)
}

/** What every visitor may see: the banner and whether the app is in maintenance. */
export async function publicStatus() {
  const [announcement, maintenance] = await Promise.all([getSetting('announcement'), getSetting('maintenance')])
  return {
    announcement: announcement?.active && announcement.message ? { message: announcement.message, tone: announcement.tone, href: announcement.href || null } : null,
    maintenance: maintenance?.active ? { message: maintenance.message } : null,
  }
}
