import Link from 'next/link'
import type { ReactNode } from 'react'
import { fmt, formatDate, formatNumber, getMessages } from '@/i18n'

/** Small server-rendered pieces shared by the admin pages. */

export function PageHeader({ title, body, actions }: { title: string; body?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-[720px]">
        <h1 className="app-page-title">{title}</h1>
        {body ? <p className="mt-2 text-[15px] text-[var(--text-muted)]">{body}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="m-card p-4">
      <dt className="text-[13px] text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 text-[24px] font-semibold tabular-nums">{value}</dd>
      {hint ? <dd className="mt-0.5 text-[12px] text-[var(--text-subtle)]">{hint}</dd> : null}
    </div>
  )
}

/** Tabs as links (?tab=), so each tab has its own URL and works without script. */
export function TabLinks({ base, active, tabs, label }: { base: string; active: string; tabs: Array<{ key: string; label: string }>; label: string }) {
  return (
    <nav aria-label={label} className="mb-6 overflow-x-auto">
      <ul className="seg">
        {tabs.map((t) => (
          <li key={t.key}><Link href={t.key === tabs[0]!.key ? base : `${base}?tab=${t.key}`} aria-current={active === t.key ? 'page' : undefined} data-state={active === t.key ? 'on' : 'off'} className="seg-item inline-flex items-center no-underline">{t.label}</Link></li>
        ))}
      </ul>
    </nav>
  )
}

export function Pagination({ page, hasNext, href }: { page: number; hasNext: boolean; href: (page: number) => string }) {
  const t = getMessages().admin.common
  if (page === 1 && !hasNext) return null
  return (
    <nav aria-label={fmt(t.pageOf, { page })} className="mt-4 flex items-center justify-between gap-2 text-[14px]">
      {page > 1 ? <Link className="m-btn secondary sm" href={href(page - 1)}>{t.previous}</Link> : <span />}
      <span className="text-[var(--text-muted)]">{fmt(t.pageOf, { page })}</span>
      {hasNext ? <Link className="m-btn secondary sm" href={href(page + 1)}>{t.next}</Link> : <span />}
    </nav>
  )
}

/** Builds a URL with the current filters plus changes (empty values dropped). */
export function withParams(base: string, params: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '' && !(k === 'page' && Number(v) === 1)) q.set(k, String(v))
  const s = q.toString()
  return s ? `${base}?${s}` : base
}

export function When({ date }: { date: Date | string | null | undefined }) {
  if (!date) return <span className="text-[var(--text-subtle)]">{getMessages().admin.common.never}</span>
  // Aggregates (min/max) come back from Postgres as text like "2026-11-02 09:00:00.123+00".
  const d = typeof date === 'string' ? new Date(date.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00')) : date
  if (Number.isNaN(d.getTime())) return <span>{String(date)}</span>
  const iso = d.toISOString()
  return <time dateTime={iso} title={iso.replace('T', ' ').slice(0, 19) + ' UTC'}>{formatDate(iso.slice(0, 10))} {iso.slice(11, 16)}</time>
}

const TONE: Record<string, string> = {
  active: 'ok', succeeded: 'ok', delivered: 'ok', approved: 'ok', actioned: 'ok',
  suspended: 'warn', disabled: 'warn', pending: 'warn', queued: 'warn', running: 'warn', pending_consent: 'warn', processing: 'warn',
  banned: 'bad', taken_down: 'bad', failed: 'bad', rejected: 'bad', revoked: 'bad',
}

/** A state chip: color plus the word, never color alone. */
export function StateBadge({ state, label }: { state: string; label?: string }) {
  const tone = TONE[state] ?? 'neutral'
  const color = tone === 'ok' ? 'var(--success)' : tone === 'warn' ? 'var(--warning)' : tone === 'bad' ? 'var(--danger)' : 'var(--text-subtle)'
  return (
    <span className="m-badge">
      <span aria-hidden="true" className="size-2 rounded-full" style={{ background: color }} />
      {label ?? state.replace(/_/g, ' ')}
    </span>
  )
}

export function TableWrap({ label, children }: { label: string; children: ReactNode }) {
  return <div className="m-card relative overflow-x-auto" role="region" aria-label={label} tabIndex={0}>{children}</div>
}

export function Empty({ children }: { children?: ReactNode }) {
  return <p className="app-empty">{children ?? getMessages().admin.common.empty}</p>
}

/**
 * One series per day as thin bars on a zero baseline, with a hover label per bar and the same
 * numbers as a table for keyboard and screen-reader users.
 */
export function DayBars({ title, points }: { title: string; points: Array<{ day: string; value: number }> }) {
  const t = getMessages().admin
  const max = Math.max(1, ...points.map((p) => p.value))
  const total = points.reduce((n, p) => n + p.value, 0)
  return (
    <figure className="m-card grid gap-3 p-4 sm:p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[16px] font-semibold">{title}</span>
        <span className="text-[13px] tabular-nums text-[var(--text-muted)]">{formatNumber(total)}</span>
      </figcaption>
      <div className="relative">
        <div className="flex h-36 items-end gap-[2px] border-b border-[var(--border-strong)]" aria-hidden="true">
          {points.map((p) => (
            <div key={p.day} className="admin-bar group relative flex h-full min-w-0 flex-1 items-end">
              <div className="w-full rounded-t-[4px] bg-[var(--primary)]" style={{ height: `${p.value ? Math.max(2, (p.value / max) * 100) : 0}%` }} />
              <span className="admin-tip">{fmt(t.overview.tooltip, { value: formatNumber(p.value), day: formatDate(p.day) })}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between text-[12px] text-[var(--text-subtle)]" aria-hidden="true">
        <span>{formatDate(points[0]!.day)}</span><span>{formatDate(points[points.length - 1]!.day)}</span>
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-[14px] font-semibold">{t.common.showTable}</summary>
        <div className="max-h-[280px] overflow-auto" role="region" aria-label={title} tabIndex={0}>
          <table className="app-table">
            <thead><tr><th scope="col">{t.overview.tableDay}</th><th scope="col" className="text-right">{t.overview.tableValue}</th></tr></thead>
            <tbody>{points.map((p) => <tr key={p.day}><td>{formatDate(p.day)}</td><td className="text-right tabular-nums">{formatNumber(p.value)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}

/** A GET search form: filters live in the URL, so results can be shared and the back button works. */
export function FilterForm({ action, label, children }: { action: string; label: string; children: ReactNode }) {
  const t = getMessages().admin.common
  return (
    <form method="get" action={action} role="search" aria-label={label} className="mb-4 flex flex-wrap items-end gap-3">
      {children}
      <button type="submit" className="m-btn primary">{t.search}</button>
      <Link href={action} className="m-btn ghost">{t.clear}</Link>
    </form>
  )
}

export function FilterInput({ name, label, defaultValue, type = 'search', className = 'min-w-[220px] flex-1' }: { name: string; label: string; defaultValue?: string; type?: string; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={`f-${name}`} className="m-label">{label}</label>
      <input id={`f-${name}`} name={name} type={type} className="m-input" defaultValue={defaultValue} />
    </div>
  )
}

export function FilterSelect({ name, label, value, options }: { name: string; label: string; value?: string; options: Array<{ value: string; label: string }> }) {
  return (
    <div className="min-w-[160px]">
      <label htmlFor={`f-${name}`} className="m-label">{label}</label>
      <select id={`f-${name}`} name={name} className="m-select" defaultValue={value ?? ''}>
        <option value="">{getMessages().admin.common.all}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function FilterCheck({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return <label className="flex min-h-11 items-center gap-2 text-[15px]"><input type="checkbox" name={name} value="1" defaultChecked={checked} className="size-5 accent-[var(--primary)]" />{label}</label>
}

/** A short notice in the flow of the page (role="status" so it's announced when it appears). */
export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning'; children: ReactNode }) {
  return (
    <div role="status" className="m-card mb-6 flex gap-3 p-4 text-[15px]" style={{ borderColor: tone === 'warning' ? 'var(--warning)' : 'var(--border-strong)' }}>
      <span aria-hidden="true" className="mt-1.5 size-2 flex-none rounded-full" style={{ background: tone === 'warning' ? 'var(--warning)' : 'var(--primary)' }} />
      <div>{children}</div>
    </div>
  )
}

/** Label/value pairs. */
export function Facts({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-[14px] sm:grid-cols-[max-content_1fr]">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[var(--text-muted)]">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-semibold">{title}</h2>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

/** Turns Next's searchParams into plain strings (first value of each). */
export function plainParams(sp: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(sp)) { const s = Array.isArray(v) ? v[0] : v; if (s !== undefined) out[k] = s }
  return out
}

export function bytes(n: number | null): string {
  if (n === null) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0; let v = n
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${formatNumber(Math.round(v * 10) / 10)} ${units[i]}`
}

export function moduleLabel(m: string): string {
  return (getMessages().app.developers.usage.modules as Record<string, string>)[m] ?? m
}

export function planLabel(id: string | null | undefined): string {
  if (!id) return '—'
  return (getMessages().pricing.plans as Record<string, { name: string }>)[id]?.name ?? id
}
