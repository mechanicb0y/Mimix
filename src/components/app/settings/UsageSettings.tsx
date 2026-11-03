'use client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api } from '@/lib/api-client'
import { getMessages, formatDateTime, formatNumber } from '@/i18n'
import { UsagePanel } from '@/components/app/developers/UsagePanel'
import { Section } from './Section'

interface Row { id: string; delta: number; bucket: 'plan' | 'top_up'; reason: string; module: string | null; balanceAfter: number; createdAt: string }

export function UsageSettings({ canListKeys }: { canListKeys: boolean }) {
  const t = getMessages().app.settings.usage
  const mods = getMessages().app.developers.usage.modules as Record<string, string>
  const c = getMessages().app.common
  const q = useInfiniteQuery({
    queryKey: ['ledger'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api<{ items: Row[]; nextBefore: string | null }>(`/api/v1/credits/ledger${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ''}`),
    getNextPageParam: (last) => last.nextBefore,
  })
  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data])
  return (
    <>
      <div className="m-card p-4 sm:p-6"><UsagePanel canListKeys={canListKeys} /></div>
      <Section title={t.ledger} body={t.ledgerBody}>
        {q.isLoading ? <div className="m-skeleton h-40" aria-hidden="true" /> : !rows.length ? <p className="app-empty">{t.ledgerEmpty}</p> : (
          <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label={t.ledger}>
            <table className="app-table">
              <thead><tr>{(['when', 'what', 'change', 'balance'] as const).map((k) => <th key={k} scope="col" className={k === 'change' || k === 'balance' ? 'text-right' : undefined}>{t.columns[k]}</th>)}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                    <td>{t.reasons[r.reason] ?? r.reason}{r.module ? ` · ${mods[r.module] ?? r.module}` : ''}{r.bucket === 'top_up' && r.reason !== 'top_up' ? ` · ${t.fromPack}` : ''}</td>
                    <td className={`text-right tabular-nums ${r.delta < 0 ? '' : 'text-[var(--success)]'}`}>{r.delta > 0 ? '+' : r.delta < 0 ? '−' : ''}{formatNumber(Math.abs(r.delta))}</td>
                    <td className="text-right tabular-nums">{formatNumber(r.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {q.hasNextPage ? <div><button type="button" className="m-btn secondary" aria-busy={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{c.loadMore}</button></div> : null}
      </Section>
    </>
  )
}
