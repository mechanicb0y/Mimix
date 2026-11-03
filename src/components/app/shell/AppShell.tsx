'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Dialog, DropdownMenu, Popover } from 'radix-ui'
import { Bell, Check, ChevronsUpDown, LogOut, Menu, Settings, ShieldCheck, X, AlertTriangle, Info } from 'lucide-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { activeNavKey, visibleNav, type NavFeatures } from '@/config/app-nav'
import { Icon } from '@/components/Icon'
import { Logo } from '@/components/site/Logo'
import { ThemeToggle } from '@/components/site/ThemeToggle'
import { authClient } from '@/lib/auth-client'
import { getMessages, fmt, formatDate, formatNumber } from '@/i18n'
import type { AppContext } from '@/server/app-context'
import { AppContextProvider } from './context'
import { JobsProvider } from '@/components/app/jobs/JobsProvider'
import { JobsMenu } from '@/components/app/jobs/JobsMenu'

const t = () => getMessages().app.shell

function NavList({ onNavigate, features }: { onNavigate?: () => void; features: NavFeatures }) {
  const pathname = usePathname()
  const active = activeNavKey(pathname)
  const s = t()
  return (
    <nav aria-label={s.nav} className="grid gap-5">
      {visibleNav(features).map((g, gi) => (
        <div key={gi}>
          {g.group ? <p className="mb-1 px-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]">{s.groups[g.group]}</p> : null}
          <ul className="grid gap-0.5">
            {g.items.map((i) => (
              <li key={i.key}>
                <Link href={i.href} onClick={onNavigate} aria-current={active === i.key ? 'page' : undefined}
                  className="app-nav-link">
                  <Icon name={i.icon} size={18} />{s.items[i.key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function CreditsMeter({ ctx }: { ctx: AppContext }) {
  const s = t()
  const { balance } = ctx
  if (balance.unlimited) return <p className="text-[13px] text-[var(--text-muted)]">{s.creditsUnlimited}</p>
  const pct = balance.allowance ? Math.min(100, Math.round(((balance.allowance - balance.plan) / balance.allowance) * 100)) : 100
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="font-semibold">{fmt(s.credits, { credits: formatNumber(balance.total) })}</span>
        {ctx.workspace.planId !== 'team' && ctx.workspace.role === 'owner' ? <Link href="/app/settings/billing" className="link">{s.upgrade}</Link> : null}
      </div>
      <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={fmt(s.creditsOf, { used: formatNumber(Math.max(0, balance.allowance - balance.plan)), total: formatNumber(balance.allowance) })}
        className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 90 ? 'var(--warning)' : 'var(--primary)' }} />
      </div>
    </div>
  )
}

function WorkspaceSwitcher({ ctx }: { ctx: AppContext }) {
  const s = t()
  const router = useRouter()
  if (ctx.workspaces.length < 2) return <p className="truncate px-3 text-[14px] font-semibold" title={ctx.workspace.name}>{ctx.workspace.name}</p>
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="m-btn ghost w-full justify-between" aria-label={s.switchWorkspace}>
        <span className="truncate">{ctx.workspace.name}</span><ChevronsUpDown aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="app-menu" sideOffset={6} align="start">
          {ctx.workspaces.map((w) => (
            <DropdownMenu.Item key={w.id} className="app-menu-item" onSelect={async () => {
              await fetch('/api/app/workspace', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workspaceId: w.id }) })
              router.refresh()
            }}>
              <span className="flex-1 truncate">{w.name}</span>{w.id === ctx.workspace.id ? <Check aria-hidden="true" size={16} /> : null}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

interface Notice { id: string; title: string; body: string; href: string | null; readAt: string | null; createdAt: string }

function Notifications({ unread: initial }: { unread: number }) {
  const s = t()
  const [items, setItems] = useState<Notice[] | null>(null)
  const [unread, setUnread] = useState(initial)
  // A finished job adds a notification on the server; show the dot without a reload.
  useEffect(() => {
    const bump = () => setUnread((n) => n + 1)
    window.addEventListener('mimix:job-finished', bump)
    return () => window.removeEventListener('mimix:job-finished', bump)
  }, [])
  async function load() {
    const r = await fetch('/api/v1/notifications')
    if (r.ok) { const d = await r.json(); setItems(d.items); setUnread(d.unread) }
  }
  return (
    <Popover.Root onOpenChange={(o) => { if (o) void load() }}>
      <Popover.Trigger className="m-btn ghost icon relative" aria-label={`${s.notifications}${unread ? `, ${fmt(s.unread, { count: unread })}` : ''}`}>
        <Bell aria-hidden="true" />
        {unread ? <span aria-hidden="true" className="absolute right-2 top-2 size-2 rounded-full bg-[var(--accent)]" /> : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="app-menu w-[min(360px,calc(100vw-32px))] p-0" sideOffset={8} align="end">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-[15px] font-semibold">{s.notifications}</h2>
            {unread ? <button type="button" className="link text-[13px]" onClick={async () => { await fetch('/api/v1/notifications', { method: 'POST' }); await load() }}>{s.markAllRead}</button> : null}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {items === null ? <li className="px-4 py-6 text-[14px] text-[var(--text-muted)]">{getMessages().common.a11y.loading}</li>
              : items.length === 0 ? <li className="px-4 py-6 text-[14px] text-[var(--text-muted)]">{s.noNotifications}</li>
              : items.map((n) => (
                <li key={n.id} className="border-b border-[var(--border)] last:border-0">
                  <Link href={n.href ?? '/app'} className="block px-4 py-3 no-underline hover:bg-[var(--surface-2)]">
                    <p className={`text-[14px] ${n.readAt ? '' : 'font-semibold'}`}>{n.title}</p>
                    <p className="text-[13px] text-[var(--text-muted)]">{n.body}</p>
                  </Link>
                </li>
              ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function UserMenu({ ctx }: { ctx: AppContext }) {
  const s = t()
  const router = useRouter()
  const initials = ctx.user.name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="m-btn ghost icon rounded-full" aria-label={s.account}>
        <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-[var(--surface-3)] text-[13px] font-semibold">{initials}</span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="app-menu min-w-[220px]" sideOffset={8} align="end">
          <div className="px-3 py-2"><p className="truncate text-[14px] font-semibold">{ctx.user.name}</p><p className="truncate text-[13px] text-[var(--text-muted)]">{ctx.user.email}</p></div>
          <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
          <DropdownMenu.Item className="app-menu-item" onSelect={() => router.push('/app/settings')}><Settings aria-hidden="true" size={16} />{s.settings}</DropdownMenu.Item>
          {ctx.isStaff ? <DropdownMenu.Item className="app-menu-item" onSelect={() => router.push('/admin')}><ShieldCheck aria-hidden="true" size={16} />{s.adminConsole}</DropdownMenu.Item> : null}
          <DropdownMenu.Item className="app-menu-item" onSelect={async () => { await authClient.signOut(); router.replace('/sign-in'); router.refresh() }}><LogOut aria-hidden="true" size={16} />{s.signOut}</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function Banner({ tone, children }: { tone: 'warning' | 'info'; children: React.ReactNode }) {
  return (
    <div role={tone === 'warning' ? 'alert' : 'status'} className="flex items-start gap-3 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-[14px] lg:px-8">
      {tone === 'warning' ? <AlertTriangle aria-hidden="true" size={18} className="mt-0.5 flex-none text-[var(--warning)]" /> : <Info aria-hidden="true" size={18} className="mt-0.5 flex-none text-[var(--accent)]" />}
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** Maintenance mode (admin console): the app is closed to everyone but staff. */
function Maintenance({ message }: { message: string }) {
  const s = t()
  return (
    <div className="m-card mx-auto grid max-w-[560px] gap-3 p-6 text-center">
      <h1 className="text-[22px] font-semibold">{s.maintenanceTitle}</h1>
      <p className="text-[var(--text-muted)]">{message || getMessages().errors.app.maintenance}</p>
    </div>
  )
}

/** Shown in place of a tool the voice engine can't run (its link is hidden too). */
function FeatureUnavailable({ body }: { body?: string }) {
  const s = t()
  return (
    <div className="m-card mx-auto grid max-w-[560px] gap-3 p-6 text-center">
      <h1 className="text-[22px] font-semibold">{s.unavailableTitle}</h1>
      <p className="text-[var(--text-muted)]">{body ?? s.unavailableBody}</p>
      <div><Link href="/app" className="m-btn secondary">{s.unavailableBack}</Link></div>
    </div>
  )
}

export function AppShell({ ctx, children }: { ctx: AppContext; children: React.ReactNode }) {
  const activeKey = activeNavKey(usePathname())
  const unavailable = activeKey !== null && (ctx.features as NavFeatures)[activeKey] === false
  const s = t()
  const c = getMessages().common
  const [open, setOpen] = useState(false)
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false } } }))
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => { if (mq.matches) setOpen(false) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <WorkspaceSwitcher ctx={ctx} />
      <NavList onNavigate={onNavigate} features={ctx.features} />
      <div className="mt-auto m-card p-4"><CreditsMeter ctx={ctx} /></div>
    </div>
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AppContextProvider value={ctx}>
        <JobsProvider>
        <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
          <aside className="sticky top-0 hidden h-dvh border-r border-[var(--border)] bg-[var(--surface)] lg:block">
            <div className="flex h-16 items-center px-5"><Logo id="mark-app" href="/app" /></div>
            <div className="h-[calc(100dvh-64px)]">{sidebar()}</div>
          </aside>
          <div className="min-w-0">
            <header className="sticky top-0 z-[var(--z-header)] flex h-16 items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 backdrop-blur lg:px-8">
              <Dialog.Root open={open} onOpenChange={setOpen}>
                <Dialog.Trigger className="m-btn ghost icon lg:hidden" aria-label={s.openNav}><Menu aria-hidden="true" /></Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="drawer-overlay" />
                  <Dialog.Content className="drawer-panel left-0 right-auto border-l-0 border-r" aria-describedby={undefined}>
                    <div className="flex h-16 items-center justify-between px-4">
                      <Dialog.Title className="sr-only">{s.nav}</Dialog.Title><Logo id="mark-app-drawer" href="/app" />
                      <Dialog.Close className="m-btn ghost icon" aria-label={s.closeNav}><X aria-hidden="true" /></Dialog.Close>
                    </div>
                    {sidebar(() => setOpen(false))}
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
              <span className="lg:hidden"><Logo id="mark-app-top" href="/app" /></span>
              <div className="ml-auto flex items-center gap-1">
                <ThemeToggle toLight={c.a11y.themeToLight} toDark={c.a11y.themeToDark} />
                <JobsMenu />
                <Notifications unread={ctx.unread} />
                <UserMenu ctx={ctx} />
              </div>
            </header>
            {ctx.workspace.subscriptionStatus === 'past_due' ? <Banner tone="warning">{s.pastDue} <Link href="/app/settings/billing" className="link">{s.updateCard}</Link></Banner> : null}
            {ctx.deletionPurgeAt ? <Banner tone="warning">{fmt(getMessages().app.settings.deletionBanner, { date: formatDate(ctx.deletionPurgeAt) })} <Link href="/app/settings/data" className="link">{getMessages().app.settings.deletionBannerAction}</Link></Banner> : null}
            {ctx.announcement ? <Banner tone={ctx.announcement.tone}>{ctx.announcement.message}{ctx.announcement.href ? <> <a href={ctx.announcement.href} className="link">{s.learnMore}</a></> : null}</Banner> : null}
            {ctx.previewEngine ? <Banner tone="info">{s.previewEngine}</Banner> : null}
            <main id="main" className="px-4 py-6 lg:px-8 lg:py-8">{ctx.maintenance ? <Maintenance message={ctx.maintenance.message} /> : unavailable ? <FeatureUnavailable body={activeKey === 'clone' && ctx.cloningPaused ? getMessages().errors.app.engine.cloningPaused : undefined} /> : children}</main>
          </div>
        </div>
        </JobsProvider>
      </AppContextProvider>
    </QueryClientProvider>
  )
}
