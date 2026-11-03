import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import { DEFAULT_FLAG, FLAG_KEYS, flagAllows, flagForModule, type FlagKey, type FlagRule } from '@/config/flags'
import type { Module } from '@/server/db/schema'
import { UserError } from '@/server/api/errors'
import { getMessages } from '@/i18n'

const TTL_MS = 15_000
let cache: { at: number; rules: Record<FlagKey, FlagRule> } | null = null

/** Every flag's rule (defaults for flags never edited). Cached for 15 seconds per server instance. */
export async function flagRules(): Promise<Record<FlagKey, FlagRule>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rules
  const rules = Object.fromEntries(FLAG_KEYS.map((k) => [k, DEFAULT_FLAG])) as Record<FlagKey, FlagRule>
  for (const r of await getDb().select().from(schema.featureFlag)) {
    if ((FLAG_KEYS as string[]).includes(r.key)) rules[r.key as FlagKey] = { enabled: r.enabled, plans: r.plans, userIds: r.userIds }
  }
  cache = { at: Date.now(), rules }
  return rules
}

export function forgetFlags() { cache = null }

export interface FlagSubject { userId: string | null; planId: string; unlimited?: boolean }

/** The flags as they apply to one user, for the app shell (key → on). */
export async function flagsFor(who: FlagSubject): Promise<Record<FlagKey, boolean>> {
  const rules = await flagRules()
  return Object.fromEntries(FLAG_KEYS.map((k) => [k, flagAllows(rules[k], who)])) as Record<FlagKey, boolean>
}

/** Refuses a generation for a tool that is switched off for this workspace or user (before any charge). */
export async function requireModuleFlag(module: Module, actor: { workspaceId: string; userId: string | null }) {
  const key = flagForModule(module)
  if (!key) return
  const rule = (await flagRules())[key]
  if (rule.enabled && rule.plans.length === 0) return
  const [w] = await getDb().select({ planId: schema.workspace.planId, unlimited: schema.workspace.unlimited }).from(schema.workspace).where(eq(schema.workspace.id, actor.workspaceId))
  if (!flagAllows(rule, { userId: actor.userId, planId: w?.planId ?? 'free', unlimited: w?.unlimited })) {
    throw new UserError('feature_off', getMessages('en').errors.app.featureOff, 403, { feature: key })
  }
}
