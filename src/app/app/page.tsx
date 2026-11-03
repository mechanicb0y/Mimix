import type { Metadata } from 'next'
import Link from 'next/link'
import { getAppContext } from '@/server/app-context'
import { listGenerations } from '@/server/generations'
import { visibleNav } from '@/config/app-nav'
import { Icon } from '@/components/Icon'
import { getMessages, fmt, formatNumber } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.home.seoTitle }

const QUICK = ['speech', 'mixer', 'clone', 'design', 'dubbing', 'stt'] as const

export default async function AppHome() {
  const ctx = await getAppContext()
  const t = getMessages().app
  const recent = await listGenerations(ctx.workspace.id, { limit: 6 })
  const items = visibleNav(ctx.features).flatMap((g) => g.items)
  const used = Math.max(0, ctx.balance.allowance - ctx.balance.plan)
  return (
    <div className="mx-auto grid max-w-[1200px] gap-8">
      <header>
        <h1 className="app-page-title">{fmt(t.home.greeting, { name: ctx.user.name.split(' ')[0] ?? '' })}</h1>
        <p className="mt-1 text-[var(--text-muted)]">{t.home.subtitle}</p>
      </header>
      <section aria-labelledby="quick">
        <h2 id="quick" className="mb-3 text-[20px] font-semibold">{t.home.quick}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK.filter((k) => items.some((i) => i.key === k)).map((k) => {
            const it = items.find((i) => i.key === k)!
            return (
              <li key={k}>
                <Link href={it.href} className="m-card flex items-center gap-3 p-4 no-underline transition-colors hover:border-[var(--border-strong)]">
                  <span className="icon-tile"><Icon name={it.icon} /></span>
                  <span className="font-semibold">{t.shell.items[k]}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="recent">
          <div className="mb-3 flex items-center justify-between"><h2 id="recent" className="text-[20px] font-semibold">{t.home.recent}</h2><Link href="/app/speech" className="link text-[14px]">{t.home.viewAll}</Link></div>
          {recent.length === 0 ? <p className="app-empty">{t.home.noRecent}</p> : (
            <ul className="m-card divide-y divide-[var(--border)] p-0">
              {recent.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">{typeof g.input.text === 'string' ? g.input.text : (t.jobs.types as Record<string, string>)[g.module] ?? g.module}</p>
                    <p className="text-[12px] text-[var(--text-subtle)]">{(t.jobs.types as Record<string, string>)[g.module] ?? g.module} · {g.createdAt.toLocaleString('en-GB')}</p>
                  </div>
                  <span className="m-badge">{t.jobs.status[g.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="usage" className="m-card grid content-start gap-2">
          <h2 id="usage" className="text-[17px] font-semibold">{t.home.usage}</h2>
          {ctx.balance.unlimited ? <p>{t.shell.creditsUnlimited}</p> : (
            <>
              <p className="text-[28px] font-bold leading-9">{formatNumber(ctx.balance.total)}</p>
              <p className="text-[14px] text-[var(--text-muted)]">{fmt(t.shell.creditsOf, { used: formatNumber(used), total: formatNumber(ctx.balance.allowance) })}</p>
            </>
          )}
          <Link href="/app/settings/usage" className="link text-[14px]">{t.home.viewAll}</Link>
        </section>
      </div>
    </div>
  )
}
