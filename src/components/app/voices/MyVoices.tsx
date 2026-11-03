'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Blend, Copy, Wand2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { getMessages, fmt } from '@/i18n'
import { FormMessage } from '@/components/app/Field'
import { VoiceCard, type VoiceItem } from './VoiceCard'

export function MyVoices({ limit }: { limit: number | null }) {
  const t = getMessages().app.myVoices
  const c = getMessages().app.common
  const q = useQuery({ queryKey: ['voices', 'mine'], queryFn: () => api<{ own: VoiceItem[]; saved: VoiceItem[] }>('/api/v1/voices') })
  const own = q.data?.own ?? []
  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="app-page-title">{t.title}</h1>
          <p className="mt-1 text-[var(--text-muted)]">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/voices/clone" className="m-btn primary sm"><Copy aria-hidden="true" />{t.clone}</Link>
          <Link href="/app/voices/design" className="m-btn secondary sm"><Wand2 aria-hidden="true" />{t.design}</Link>
          <Link href="/app/voices/mixer" className="m-btn secondary sm"><Blend aria-hidden="true" />{t.mix}</Link>
        </div>
      </header>
      {q.isError ? <FormMessage>{t.loadError} <button type="button" className="link" onClick={() => q.refetch()}>{c.retry}</button></FormMessage> : null}
      <section aria-labelledby="mv-own" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="mv-own" className="text-[20px] font-semibold">{t.yours}</h2>
          {q.data ? <p className="text-[13px] text-[var(--text-muted)]">{limit === null ? fmt(t.yoursCountUnlimited, { count: own.length }) : fmt(t.yoursCount, { count: own.length, limit })}</p> : null}
        </div>
        {q.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="m-skeleton h-36" />)}</div>
          : !own.length ? <p className="app-empty">{t.emptyYours}</p>
          : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {own.map((v) => (
                <VoiceCard key={v.id} v={v} actions={<>
                  {v.status === 'active' ? <Link href={`/app/speech?voice=${encodeURIComponent(v.id)}`} className="m-btn secondary sm" aria-label={`${t.use}: ${v.name}`}>{t.use}</Link> : null}
                  {v.status === 'pending_consent' ? <Link href={`/app/voices/clone?voice=${encodeURIComponent(v.id)}`} className="m-btn primary sm">{t.finishConsent}</Link> : null}
                  <Link href={`/app/voices/${encodeURIComponent(v.id)}`} className="m-btn ghost sm" aria-label={`${t.open}: ${v.name}`}>{t.open}</Link>
                </>} />
              ))}
            </ul>
          )}
      </section>
      <section aria-labelledby="mv-saved" className="grid gap-3">
        <h2 id="mv-saved" className="text-[20px] font-semibold">{t.saved}</h2>
        {q.isLoading ? <div className="m-skeleton h-24" aria-hidden="true" />
          : !q.data?.saved.length ? <div className="app-empty grid justify-items-center gap-3"><p>{t.emptySaved}</p><Link href="/app/voices/library" className="m-btn secondary sm">{t.browse}</Link></div>
          : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {q.data.saved.map((v) => (
                <VoiceCard key={v.id} v={v} actions={<Link href={`/app/speech?voice=${encodeURIComponent(v.id)}`} className="m-btn secondary sm" aria-label={`${t.use}: ${v.name}`}>{t.use}</Link>} />
              ))}
            </ul>
          )}
      </section>
    </div>
  )
}
