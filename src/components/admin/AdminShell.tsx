'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Dialog } from 'radix-ui'
import { ArrowLeft, Menu, X } from 'lucide-react'
import { Logo } from '@/components/site/Logo'
import { ThemeToggle } from '@/components/site/ThemeToggle'
import { ADMIN_NAV, ADMIN_SECURITY, type AdminNavKey } from '@/config/admin'
import { AdminApiProvider } from './admin-api'
import { fmt, getMessages } from '@/i18n'

function activeKey(pathname: string): AdminNavKey | null {
  let best: (typeof ADMIN_NAV)[number] | null = null
  for (const i of ADMIN_NAV) {
    const match = i.href === '/admin' ? pathname === '/admin' : pathname === i.href || pathname.startsWith(`${i.href}/`)
    if (match && (!best || i.href.length > best.href.length)) best = i
  }
  return best?.key ?? null
}

/**
 * The console frame: section nav (only the sections the role can open), who is signed in, and the
 * idle lock. After 15 minutes without input in this tab it moves to the lock screen; the server
 * enforces the same rule on every request.
 */
export function AdminShell({ children, allowed, user, twoFactor }: { children: React.ReactNode; allowed: AdminNavKey[]; user: { email: string; role: string }; twoFactor: boolean }) {
  const t = getMessages().admin
  const c = getMessages().common
  const pathname = usePathname()
  const router = useRouter()
  const active = activeKey(pathname)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let last = Date.now()
    const bump = () => { last = Date.now() }
    const events = ['pointerdown', 'keydown', 'scroll', 'focus'] as const
    for (const e of events) window.addEventListener(e, bump, { passive: true })
    const timer = setInterval(() => {
      if (Date.now() - last > ADMIN_SECURITY.idleMinutes * 60_000) router.replace(`/admin/unlock?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
    }, 30_000)
    return () => { clearInterval(timer); for (const e of events) window.removeEventListener(e, bump) }
  }, [router])

  const nav = (onNavigate?: () => void) => (
    <nav aria-label={t.nav.label}>
      <ul className="grid gap-0.5">
        {ADMIN_NAV.filter((i) => allowed.includes(i.key)).map((i) => (
          <li key={i.key}><Link href={i.href} onClick={onNavigate} aria-current={active === i.key ? 'page' : undefined} className="app-nav-link">{t.nav[i.key]}</Link></li>
        ))}
      </ul>
    </nav>
  )
  const footer = (
    <div className="mt-auto grid gap-3 text-[13px] text-[var(--text-muted)]">
      <p className="break-words">{fmt(t.signedInAs, { email: user.email, role: t.roles[user.role as keyof typeof t.roles] ?? user.role })}</p>
      <p>{fmt(t.idleNote, { minutes: ADMIN_SECURITY.idleMinutes })}</p>
      <Link href="/app" className="m-btn ghost sm justify-start"><ArrowLeft aria-hidden="true" />{t.backToApp}</Link>
    </div>
  )
  const brand = (id: string) => (
    <div className="flex items-center gap-2"><Logo id={id} href="/admin" /><span className="m-badge brand">{t.brand}</span></div>
  )

  return (
    <AdminApiProvider twoFactor={twoFactor}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
        <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] p-4 lg:flex">
          <div className="flex h-8 items-center px-1">{brand('mark-admin')}</div>
          {nav()}
          {footer}
        </aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-[var(--z-header)] flex h-16 items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 backdrop-blur lg:px-8">
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger className="m-btn ghost icon lg:hidden" aria-label={getMessages().app.shell.openNav}><Menu aria-hidden="true" /></Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="drawer-overlay" />
                <Dialog.Content className="drawer-panel left-0 right-auto flex flex-col gap-6 border-l-0 border-r p-4" aria-describedby={undefined}>
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="sr-only">{t.nav.label}</Dialog.Title>{brand('mark-admin-drawer')}
                    <Dialog.Close className="m-btn ghost icon" aria-label={getMessages().app.shell.closeNav}><X aria-hidden="true" /></Dialog.Close>
                  </div>
                  {nav(() => setOpen(false))}
                  {footer}
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <span className="lg:hidden">{brand('mark-admin-top')}</span>
            <div className="ml-auto"><ThemeToggle toLight={c.a11y.themeToLight} toDark={c.a11y.themeToDark} /></div>
          </header>
          <main id="main" tabIndex={-1} className="px-4 py-6 outline-none lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </AdminApiProvider>
  )
}
