import type { IconName } from '@/config/products'

/** The signed-in product's navigation. Labels come from app.shell.items. */
export type AppNavKey = 'home' | 'speech' | 'studio' | 'dubbing' | 'sfx' | 'myVoices' | 'library' | 'mixer' | 'clone' | 'design' | 'changer' | 'stt' | 'isolator' | 'developers' | 'settings'
export interface AppNavItem { key: AppNavKey; href: string; icon: IconName }

export const APP_NAV: Array<{ group: 'create' | 'voices' | 'audio' | 'build' | null; items: AppNavItem[] }> = [
  { group: null, items: [{ key: 'home', href: '/app', icon: 'Sparkles' }] },
  { group: 'create', items: [
    { key: 'speech', href: '/app/speech', icon: 'AudioLines' },
    { key: 'studio', href: '/app/studio', icon: 'BookOpen' },
    { key: 'dubbing', href: '/app/dubbing', icon: 'Languages' },
    { key: 'sfx', href: '/app/sound-effects', icon: 'Zap' },
  ] },
  { group: 'voices', items: [
    { key: 'myVoices', href: '/app/voices', icon: 'Users' },
    { key: 'library', href: '/app/voices/library', icon: 'Library' },
    { key: 'mixer', href: '/app/voices/mixer', icon: 'Blend' },
    { key: 'clone', href: '/app/voices/clone', icon: 'Copy' },
    { key: 'design', href: '/app/voices/design', icon: 'Wand' },
  ] },
  { group: 'audio', items: [
    { key: 'changer', href: '/app/voice-changer', icon: 'Repeat' },
    { key: 'stt', href: '/app/transcripts', icon: 'FileText' },
    { key: 'isolator', href: '/app/voice-isolator', icon: 'Eraser' },
  ] },
  { group: 'build', items: [
    { key: 'developers', href: '/app/developers', icon: 'Code' },
    { key: 'settings', href: '/app/settings', icon: 'Shield' },
  ] },
]

/** Feature flags from the voice engine (engineFeatures); a nav key set to false is hidden. */
export type NavFeatures = Partial<Record<AppNavKey, boolean>>

/** The navigation without the tools the voice engine can't run. */
export function visibleNav(features: NavFeatures) {
  return APP_NAV.map((g) => ({ ...g, items: g.items.filter((i) => features[i.key] !== false) })).filter((g) => g.items.length)
}

/** Longest matching prefix wins, so /app/voices/mixer highlights the mixer, not My voices. */
export function activeNavKey(pathname: string): AppNavKey | null {
  let best: AppNavItem | null = null
  for (const g of APP_NAV) for (const i of g.items) {
    const match = i.href === '/app' ? pathname === '/app' : pathname === i.href || pathname.startsWith(`${i.href}/`)
    if (match && (!best || i.href.length > best.href.length)) best = i
  }
  return best?.key ?? null
}
