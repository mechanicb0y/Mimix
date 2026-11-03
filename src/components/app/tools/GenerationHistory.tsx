'use client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api } from '@/lib/api-client'
import { getMessages, plural } from '@/i18n'
import { FormMessage } from '@/components/app/Field'
import { GenerationPlayer, type GenerationLike } from '@/components/app/GenerationPlayer'

export interface HistoryGen extends GenerationLike { credits: number; createdAt: string; voiceId: string | null }

/** Recent generations of one module, newest first, with load more. */
export function GenerationHistory({ module, title, empty, label }: { module: string; title: string; empty: string; label: (g: HistoryGen) => string }) {
  const c = getMessages().app.common
  const q = useInfiniteQuery({
    queryKey: ['history', module],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api<{ items: HistoryGen[]; nextBefore: string | null }>(`/api/v1/history?module=${module}&limit=10${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ''}`),
    getNextPageParam: (last) => last.nextBefore,
  })
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items).filter((g) => g.audioUrl) ?? [], [q.data])
  const hid = `hist-${module}`
  return (
    <section aria-labelledby={hid} className="grid gap-3">
      <h2 id={hid} className="text-[20px] font-semibold">{title}</h2>
      {q.isLoading ? <div className="m-skeleton h-16" aria-hidden="true" />
        : q.isError ? <FormMessage>{c.networkError} <button type="button" className="link" onClick={() => q.refetch()}>{c.retry}</button></FormMessage>
        : !items.length ? <p className="app-empty">{empty}</p>
        : (
          <ul className="grid gap-2">
            {items.map((g) => (
              <li key={g.id} className="m-card grid gap-2 p-4">
                <p className="line-clamp-2 text-[14px]">{label(g)}</p>
                <p className="text-[12px] text-[var(--text-subtle)]">{new Date(g.createdAt).toLocaleString()} · {plural(g.credits, c.creditsOne, c.credits)}</p>
                <GenerationPlayer g={g} title={label(g)} />
              </li>
            ))}
          </ul>
        )}
      {q.hasNextPage ? <button type="button" className="m-btn secondary justify-self-center" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{c.loadMore}</button> : null}
    </section>
  )
}
