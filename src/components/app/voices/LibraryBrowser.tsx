'use client'
import Link from 'next/link'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, BookmarkCheck, Search } from 'lucide-react'
import { useDeferredValue, useId, useMemo, useState } from 'react'
import { api } from '@/lib/api-client'
import { getMessages, fmt, plural } from '@/i18n'
import { languageName } from '@/config/languages'
import { AGES, GENDERS, USE_CASES } from '@/lib/schemas/voices'
import { FormMessage } from '@/components/app/Field'
import { VoiceCard, type VoiceItem } from './VoiceCard'

type Filters = { q: string; language: string; gender: string; age: string; accent: string; useCase: string; licence: string; sort: 'name' | 'newest' }
const EMPTY: Filters = { q: '', language: '', gender: '', age: '', accent: '', useCase: '', licence: '', sort: 'name' }

export function LibraryBrowser({ canSave }: { canSave: boolean }) {
  const t = getMessages().app.libraryApp
  const f = getMessages().library.filters
  const vals = getMessages().library.values
  const mx = getMessages().app.mixer
  const c = getMessages().app.common
  const id = useId()
  const qc = useQueryClient()
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const deferred = useDeferredValue(filters)
  const params = useMemo(() => new URLSearchParams(Object.entries(deferred).filter(([, v]) => v)).toString(), [deferred])
  const facets = useQuery({ queryKey: ['library', 'facets'], queryFn: () => api<{ facets: { languages: string[]; accents: string[] } }>('/api/v1/library?facets=1'), staleTime: 300_000 })
  const list = useInfiniteQuery({
    queryKey: ['library', params],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api<{ items: VoiceItem[]; page: number; hasMore: boolean }>(`/api/v1/library?${params}&page=${pageParam}`),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  })
  const items = list.data?.pages.flatMap((p) => p.items) ?? []
  const toggle = useMutation({
    mutationFn: (v: VoiceItem) => api(`/api/v1/voices/${v.id}/save`, { method: v.saved ? 'DELETE' : 'POST' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['library'] }); void qc.invalidateQueries({ queryKey: ['voices'] }) },
  })
  const set = (k: keyof Filters, v: string) => setFilters((x) => ({ ...x, [k]: v }))
  const sel = (k: keyof Filters, label: string, opts: Array<[string, string]>) => (
    <div>
      <label htmlFor={`${id}-${k}`} className="m-label">{label}</label>
      <select id={`${id}-${k}`} className="m-select" value={filters[k]} onChange={(e) => set(k, e.target.value)}>
        <option value="">{f.any}</option>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
  const filtered = Object.entries(filters).some(([k, v]) => k !== 'sort' && v)

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <header>
        <h1 className="app-page-title">{t.title}</h1>
        <p className="mt-1 text-[var(--text-muted)]">{t.subtitle}</p>
      </header>
      <form role="search" className="m-card grid gap-4 p-4 sm:p-6" onSubmit={(e) => e.preventDefault()} aria-label={f.title}>
        <div>
          <label htmlFor={`${id}-q`} className="m-label">{f.search}</label>
          <div className="relative">
            <Search aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-subtle)]" />
            <input id={`${id}-q`} type="search" className="m-input pl-10" placeholder={f.searchPlaceholder} value={filters.q} onChange={(e) => set('q', e.target.value)} maxLength={80} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sel('language', f.language, (facets.data?.facets.languages ?? []).map((l) => [l, languageName(l)]))}
          {sel('accent', f.accent, (facets.data?.facets.accents ?? []).map((a) => [a, (vals.accent as Record<string, string>)[a] ?? a]))}
          {sel('gender', f.gender, GENDERS.map((g) => [g, vals.gender[g]]))}
          {sel('age', f.age, AGES.map((a) => [a, vals.age[a]]))}
          {sel('useCase', f.useCase, USE_CASES.map((u) => [u, vals.useCase[u]]))}
          {sel('licence', t.licence, [['remix', mx.licences.remix], ['standard', mx.licences.standard]])}
          <div>
            <label htmlFor={`${id}-sort`} className="m-label">{t.sort}</label>
            <select id={`${id}-sort`} className="m-select" value={filters.sort} onChange={(e) => set('sort', e.target.value)}>
              <option value="name">{t.sortName}</option><option value="newest">{t.sortNewest}</option>
            </select>
          </div>
          <div className="flex items-end">{filtered ? <button type="button" className="m-btn ghost" onClick={() => setFilters(EMPTY)}>{f.reset}</button> : null}</div>
        </div>
      </form>
      <section aria-labelledby={`${id}-res`} className="grid gap-3">
        <h2 id={`${id}-res`} className="sr-only">{f.results.replace('{count}', '')}</h2>
        <p className="text-[14px] text-[var(--text-muted)]" role="status" aria-live="polite">
          {list.isLoading ? c.loading : `${plural(items.length, f.resultsOne, f.results)}${list.hasNextPage ? '+' : ''}`}
        </p>
        {list.isError ? <FormMessage>{t.loadError} <button type="button" className="link" onClick={() => list.refetch()}>{c.retry}</button></FormMessage>
          : list.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="m-skeleton h-36" />)}</div>
          : !items.length ? (
            <div className="app-empty grid justify-items-center gap-2">
              <p className="font-semibold">{getMessages().library.empty.title}</p><p>{getMessages().library.empty.body}</p>
              <button type="button" className="m-btn secondary sm" onClick={() => setFilters(EMPTY)}>{getMessages().library.empty.action}</button>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((v) => (
                <VoiceCard key={v.id} v={v} actions={<>
                  <Link href={`/app/speech?voice=${encodeURIComponent(v.id)}`} className="m-btn secondary sm" aria-label={`${t.use}: ${v.name}`}>{t.use}</Link>
                  {v.licence === 'remix' ? <Link href="/app/voices/mixer" className="m-btn ghost sm" aria-label={`${t.mix}: ${v.name}`}>{t.mix}</Link> : null}
                  {canSave && !v.owned ? (
                    <button type="button" className="m-btn ghost sm" aria-pressed={v.saved} aria-label={fmt(v.saved ? t.unsave : t.save, { name: v.name })} disabled={toggle.isPending} onClick={() => toggle.mutate(v)}>
                      {v.saved ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}{v.saved ? t.savedShort : t.saveShort}
                    </button>
                  ) : null}
                </>} />
              ))}
            </ul>
          )}
        {list.hasNextPage ? <button type="button" className="m-btn secondary justify-self-center" disabled={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>{c.loadMore}</button> : null}
      </section>
    </div>
  )
}
