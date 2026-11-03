import type { Module } from '@/server/db/schema'

/**
 * Product switches the admin console can turn off, roll out by plan, or give to named users.
 * Each one gates the tool's page and every generation it starts. All are on by default.
 * Keys match the app navigation keys, so the nav hides a tool that is off.
 */
export const FEATURE_FLAGS = {
  speech: ['tts'],
  studio: ['studio', 'studio_export'],
  dubbing: ['dubbing'],
  sfx: ['sfx'],
  mixer: ['mix_preview', 'mix_save'],
  clone: ['clone'],
  design: ['design'],
  changer: ['changer'],
  stt: ['stt'],
  isolator: ['isolator'],
} as const satisfies Record<string, readonly Module[]>
export type FlagKey = keyof typeof FEATURE_FLAGS
export const FLAG_KEYS = Object.keys(FEATURE_FLAGS) as FlagKey[]

export function flagForModule(module: Module): FlagKey | null {
  for (const k of FLAG_KEYS) if ((FEATURE_FLAGS[k] as readonly string[]).includes(module)) return k
  return null
}

export interface FlagRule { enabled: boolean; plans: string[]; userIds: string[] }
export const DEFAULT_FLAG: FlagRule = { enabled: true, plans: [], userIds: [] }

/** Whether a rule lets this user (on this plan) use the feature. The super-admin always can. */
export function flagAllows(rule: FlagRule, who: { userId: string | null; planId: string; unlimited?: boolean }): boolean {
  if (who.unlimited) return true
  if (who.userId && rule.userIds.includes(who.userId)) return true
  if (!rule.enabled) return false
  return rule.plans.length === 0 || rule.plans.includes(who.planId)
}
