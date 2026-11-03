'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getMessages } from '@/i18n'

export const SETTINGS_SECTIONS = ['profile', 'security', 'notifications', 'billing', 'usage', 'team', 'data'] as const

/** Section links: a vertical list on wide screens, a scrolling row on phones. */
export function SettingsNav() {
  const t = getMessages().app.settings
  const path = usePathname()
  return (
    <nav aria-label={t.navLabel} className="min-w-0">
      <ul className="flex gap-1 overflow-x-auto border-b border-[var(--border)] pb-2 lg:flex-col lg:overflow-visible lg:border-b-0 lg:pb-0">
        {SETTINGS_SECTIONS.map((k) => {
          const href = `/app/settings/${k}`
          const active = path === href
          return (
            <li key={k}>
              <Link href={href} aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 items-center whitespace-nowrap rounded-[10px] px-3 text-[14px] font-semibold ${active ? 'bg-[var(--surface-2)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                {t.nav[k]}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
