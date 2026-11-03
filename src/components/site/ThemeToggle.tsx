'use client'
import { Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'

export const THEME_KEY = 'mimix-theme'
type Theme = 'dark' | 'light'

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => obs.disconnect()
}
const getTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try { localStorage.setItem(THEME_KEY, theme) } catch { /* storage blocked: the choice lasts for this page only */ }
}

/** Dark is the default; the toggle remembers the visitor's choice. */
export function ThemeToggle({ toLight, toDark, className = '' }: { toLight: string; toDark: string; className?: string }) {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'dark' as Theme)
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  return (
    <button type="button" className={`m-btn ghost icon ${className}`} onClick={() => setTheme(next)} aria-label={next === 'light' ? toLight : toDark} title={next === 'light' ? toLight : toDark}>
      {theme === 'dark' ? <Sun strokeWidth={1.75} aria-hidden="true" /> : <Moon strokeWidth={1.75} aria-hidden="true" />}
    </button>
  )
}

/** Runs before first paint so a saved light theme never flashes dark. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`
