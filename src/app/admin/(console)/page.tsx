import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminPage } from '@/server/admin/guard'
import { overview } from '@/server/admin/platform'
import { DayBars, Notice, PageHeader, Section, Stat } from '@/components/admin/ui'
import { formatPrice } from '@/config/plans'
import { fmt, formatNumber, getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: getMessages().admin.nav.overview }

const RANGES = ['7', '30', '90'] as const

export default async function AdminOverview({ searchParams }: PageProps<'/admin'>) {
  await requireAdminPage('viewOverview', '/admin')
  const sp = await searchParams
  const t = getMessages().admin.overview
  const range = (RANGES as readonly string[]).includes(String(sp.range)) ? (Number(sp.range) as 7 | 30 | 90) : 30
  const o = await overview(range)
  const attention = [
    o.openReports ? { href: '/admin/voices', text: (o.openReports === 1 ? t.openReportsOne : fmt(t.openReports, { count: formatNumber(o.openReports) })) } : null,
    o.pendingPublish ? { href: '/admin/voices?tab=publish', text: (o.pendingPublish === 1 ? t.pendingPublishOne : fmt(t.pendingPublish, { count: formatNumber(o.pendingPublish) })) } : null,
    o.staffWithout2fa ? { href: '/admin/users', text: (o.staffWithout2fa === 1 ? t.staffWithout2faOne : fmt(t.staffWithout2fa, { count: formatNumber(o.staffWithout2fa) })) } : null,
  ].filter((x): x is { href: string; text: string } => !!x)

  return (
    <>
      {sp.denied ? <Notice tone="warning">{getMessages().admin.denied}</Notice> : null}
      <PageHeader title={t.title} actions={
        <nav aria-label={t.range}>
          <ul className="seg">
            {RANGES.map((r) => (
              <li key={r}><Link href={r === '30' ? '/admin' : `/admin?range=${r}`} aria-current={String(range) === r ? 'page' : undefined} data-state={String(range) === r ? 'on' : 'off'} className="seg-item inline-flex items-center no-underline">{t.ranges[r]}</Link></li>
            ))}
          </ul>
        </nav>
      } />
      <dl className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label={t.signups} value={formatNumber(o.signups)} />
        <Stat label={t.activeUsers} value={formatNumber(o.activeUsers)} hint={t.activeUsersHint} />
        <Stat label={t.generations} value={formatNumber(o.generations)} />
        <Stat label={t.characters} value={formatNumber(o.characters)} />
        <Stat label={t.revenue} value={formatPrice(o.revenueCents, 'USD')} hint={t.revenueHint} />
        <Stat label={t.errorRate} value={`${(o.errorRate * 100).toFixed(1)}%`} hint={fmt(t.errorRateHint, { failed: formatNumber(o.failed), total: formatNumber(o.generations) })} />
      </dl>
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <DayBars title={t.chartSignups} points={o.series.signups} />
        <DayBars title={t.chartGenerations} points={o.series.generations} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t.queue}>
          <div className="m-card p-4">
            <dl className="grid grid-cols-3 gap-3">
              <div><dt className="text-[13px] text-[var(--text-muted)]">{t.queued}</dt><dd className="text-[20px] font-semibold tabular-nums">{formatNumber(o.queue.queued)}</dd></div>
              <div><dt className="text-[13px] text-[var(--text-muted)]">{t.running}</dt><dd className="text-[20px] font-semibold tabular-nums">{formatNumber(o.queue.running)}</dd></div>
              <div><dt className="text-[13px] text-[var(--text-muted)]">{t.failed24h}</dt><dd className="text-[20px] font-semibold tabular-nums">{formatNumber(o.queue.failed24h)}</dd></div>
            </dl>
            <p className="mt-3 text-[14px] text-[var(--text-muted)]">{o.queue.oldestWaitingMinutes !== null ? fmt(t.oldest, { minutes: formatNumber(o.queue.oldestWaitingMinutes) }) : t.queueOk}</p>
          </div>
        </Section>
        <Section title={t.attention}>
          <div className="m-card p-4">
            {attention.length ? (
              <ul className="grid gap-2 text-[15px]">{attention.map((a) => <li key={a.href}><Link href={a.href} className="tap">{a.text}</Link></li>)}</ul>
            ) : <p className="text-[15px] text-[var(--text-muted)]">{t.allClear}</p>}
          </div>
        </Section>
      </div>
    </>
  )
}
