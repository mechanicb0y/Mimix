'use client'
import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages, fmt, formatDate, formatNumber } from '@/i18n'
import { FormMessage } from '@/components/app/Field'
import type { ApiKeyView } from './KeysPanel'

interface Usage {
  balance: { total: number; unlimited: boolean }
  totals: { credits: number; requests: number }
  modules: Record<string, number>
  days: Array<{ day: string; credits: number; requests: number }>
  keys: Array<{ apiKeyId: string | null; credits: number; requests: number }>
}

export function UsagePanel({ canListKeys }: { canListKeys: boolean }) {
  const t = getMessages().app.developers.usage
  const c = getMessages().app.common
  const id = useId()
  const [keyId, setKeyId] = useState('')
  const keys = useQuery({ queryKey: ['api-keys'], queryFn: () => api<{ items: ApiKeyView[] }>('/api/v1/keys'), enabled: canListKeys })
  const q = useQuery({ queryKey: ['usage', keyId], queryFn: () => api<Usage>(`/api/v1/usage${keyId ? `?apiKeyId=${encodeURIComponent(keyId)}` : ''}`) })
  const names = new Map((keys.data?.items ?? []).map((k) => [k.id, k.name]))
  const u = q.data
  const max = Math.max(1, ...(u?.days.map((d) => d.credits) ?? [0]))
  const moduleRows = Object.entries(u?.modules ?? {}).sort((a, b) => b[1] - a[1])
  const label = (m: string) => (t.modules as Record<string, string>)[m] ?? m

  return (
    <section className="grid gap-4" aria-labelledby={`${id}-t`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-[640px]">
          <h2 id={`${id}-t`} className="text-[18px] font-semibold">{t.title}</h2>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">{t.body}</p>
        </div>
        {canListKeys && keys.data?.items.length ? (
          <div>
            <label htmlFor={`${id}-k`} className="m-label">{t.filter}</label>
            <select id={`${id}-k`} className="m-select" value={keyId} onChange={(e) => setKeyId(e.target.value)}>
              <option value="">{t.allKeys}</option>
              {keys.data.items.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
        ) : null}
      </div>
      {q.isLoading ? <div className="m-skeleton h-48" aria-hidden="true" /> : q.isError || !u ? (
        <FormMessage>{q.error instanceof ApiClientError ? q.error.message : c.networkError}</FormMessage>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Stat label={t.totalCredits} value={formatNumber(u.totals.credits)} />
            <Stat label={t.totalRequests} value={formatNumber(u.totals.requests)} />
            <Stat label={t.balance} value={u.balance.unlimited ? t.unlimited : formatNumber(u.balance.total)} />
          </dl>
          {!u.totals.requests ? <p className="app-empty">{t.empty}</p> : (
            <>
              <figure className="m-card p-4 sm:p-6">
                <figcaption className="text-[16px] font-semibold">{t.chartTitle}</figcaption>
                <div className="mt-4 flex h-40 items-end gap-[2px]" aria-hidden="true">
                  {u.days.map((d) => (
                    <div key={d.day} className="group relative flex h-full min-w-0 flex-1 items-end" title={fmt(t.chartSummary, { credits: formatNumber(d.credits), day: formatDate(d.day) })}>
                      <div className="w-full rounded-t-[3px] bg-[var(--primary)]" style={{ height: `${d.credits ? Math.max(2, (d.credits / max) * 100) : 0}%` }} />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[12px] text-[var(--text-subtle)]" aria-hidden="true">
                  <span>{formatDate(u.days[0]!.day)}</span><span>{formatDate(u.days[u.days.length - 1]!.day)}</span>
                </div>
                <details className="mt-3">
                  <summary className="min-h-11 cursor-pointer py-2 text-[14px] font-semibold">{t.showTable}</summary>
                  <div className="relative max-h-[320px] overflow-auto" tabIndex={0} role="region" aria-label={t.chartTitle}>
                    <table className="app-table">
                      <thead><tr><th scope="col">{t.tableDay}</th><th scope="col">{t.tableCredits}</th><th scope="col">{t.tableRequests}</th></tr></thead>
                      <tbody>{u.days.filter((d) => d.requests).map((d) => <tr key={d.day}><td>{formatDate(d.day)}</td><td>{formatNumber(d.credits)}</td><td>{formatNumber(d.requests)}</td></tr>)}</tbody>
                    </table>
                  </div>
                </details>
              </figure>
              <div className="grid gap-4 lg:grid-cols-2">
                <Breakdown title={t.byModule} rows={moduleRows.map(([m, n]) => ({ key: m, label: label(m), credits: n }))} total={u.totals.credits} />
                {!keyId ? (
                  <Breakdown title={t.byKey} total={u.totals.credits}
                    rows={u.keys.sort((a, b) => b.credits - a.credits).map((k) => ({ key: k.apiKeyId ?? 'app', label: k.apiKeyId ? names.get(k.apiKeyId) ?? (canListKeys ? t.deletedKey : k.apiKeyId) : t.appOnly, credits: k.credits }))} />
                ) : null}
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="m-card p-4">
      <dt className="text-[13px] text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 text-[24px] font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function Breakdown({ title, rows, total }: { title: string; rows: Array<{ key: string; label: string; credits: number }>; total: number }) {
  const t = getMessages().app.developers.usage
  return (
    <div className="m-card p-4 sm:p-6">
      <h3 className="text-[16px] font-semibold">{title}</h3>
      <table className="app-table mt-2">
        <thead><tr><th scope="col"><span className="sr-only">{title}</span></th><th scope="col" className="text-right">{t.tableCredits}</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>
                {r.label}
                <div className="mt-1 h-1.5 rounded-full bg-[var(--surface-2)]" aria-hidden="true"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${total ? (r.credits / total) * 100 : 0}%` }} /></div>
              </td>
              <td className="text-right tabular-nums">{formatNumber(r.credits)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
