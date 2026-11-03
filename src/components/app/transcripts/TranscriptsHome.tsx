'use client'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { useJob } from '@/lib/use-job'
import { getMessages, fmt, plural } from '@/i18n'
import { CREDIT_RATES } from '@/config/plans'
import { FORM_LANGUAGES, languageName } from '@/config/languages'
import { FormMessage } from '@/components/app/Field'
import { MediaInput, type ReadyMedia } from '@/components/app/MediaInput'
import { OverQuota } from '@/components/app/OverQuota'
import { JobProgress } from '@/components/app/JobProgress'
import { formatTime } from '@/components/ui/AudioPlayer'
import { useAppContext } from '@/components/app/shell/context'

interface Item { id: string; status: string; title: string; durationMs: number | null; credits: number; language: string | null; segments: number; createdAt: string }

export function TranscriptsHome({ maxMs, canGenerate }: { maxMs: number; canGenerate: boolean }) {
  const t = getMessages().app.stt
  const c = getMessages().app.common
  const ch = getMessages().app.changer
  const id = useId()
  const ctx = useAppContext()
  const qc = useQueryClient()
  const router = useRouter()
  const [media, setMedia] = useState<ReadyMedia | null>(null)
  const [language, setLanguage] = useState('')
  const [speakers, setSpeakers] = useState('')
  const [error, setError] = useState<ApiClientError | null>(null)

  const list = useInfiniteQuery({
    queryKey: ['transcripts'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api<{ items: Item[]; nextBefore: string | null }>(`/api/v1/transcripts?limit=20${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ''}`),
    getNextPageParam: (last) => last.nextBefore,
  })
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data])

  const job = useJob((j) => {
    void qc.invalidateQueries({ queryKey: ['transcripts'] })
    router.refresh()
    if (j.status === 'succeeded') router.push(`/app/transcripts/${String(j.output?.generationId)}`)
  }, { resume: { types: ['stt'] } })

  const minutes = media ? Math.max(1, Math.ceil(media.durationMs / 60_000)) : 0
  const credits = minutes * CREDIT_RATES.sttPerMinute
  const notEnough = !!media && !ctx.balance.unlimited && credits > ctx.balance.total

  const run = async () => {
    if (!media) return
    setError(null)
    try {
      const j = await api<{ id: string }>('/api/v1/speech-to-text', {
        method: 'POST',
        json: { uploadId: media.uploadId, language: language || undefined, speakers: speakers ? Number(speakers) : undefined, declaredMs: media.durationMs },
      })
      job.start(j.id)
      setMedia(null)
      void qc.invalidateQueries({ queryKey: ['transcripts'] })
    } catch (e) {
      if (e instanceof ApiClientError) setError(e)
    }
  }

  return (
    <div className="mx-auto grid max-w-[1100px] gap-6">
      <header>
        <h1 className="app-page-title">{t.title}</h1>
        <p className="mt-1 text-[var(--text-muted)]">{t.subtitle}</p>
      </header>
      {!canGenerate ? <FormMessage tone="info">{c.viewerReadOnly}</FormMessage> : (
        <section className="m-card grid gap-4 p-4 sm:p-6" aria-labelledby={`${id}-new`}>
          <h2 id={`${id}-new`} className="text-[18px] font-semibold">{t.newTitle}</h2>
          <MediaInput value={media} onChange={setMedia} maxMs={maxMs} error={error?.fields.uploadId} />
          <p className="m-hint">{t.rights}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-lang`} className="m-label">{t.language}</label>
              <select id={`${id}-lang`} className="m-select" value={language} onChange={(e) => setLanguage(e.target.value)} aria-invalid={error?.fields.language ? true : undefined}>
                <option value="">{t.detect}</option>
                {FORM_LANGUAGES.map((l) => <option key={l} value={l}>{languageName(l)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-spk`} className="m-label">{t.speakers}</label>
              <select id={`${id}-spk`} className="m-select" value={speakers} onChange={(e) => setSpeakers(e.target.value)}>
                <option value="">{t.speakersAuto}</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? t.speakersOne : fmt(t.speakersN, { count: n })}</option>)}
              </select>
            </div>
          </div>
          {notEnough ? <OverQuota needed={credits} available={ctx.balance.total} /> : null}
          {error?.code === 'insufficient_credits' ? <OverQuota needed={Number(error.extra.needed)} available={Number(error.extra.available)} /> : null}
          {error && error.code !== 'insufficient_credits' && !Object.keys(error.fields).length ? <FormMessage>{error.message}</FormMessage> : null}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="m-btn primary lg" onClick={run} disabled={!media || notEnough || job.active}>
              <FileText aria-hidden="true" />{job.active ? t.starting : t.start}
            </button>
            <span className="text-[13px] text-[var(--text-muted)]">{media ? fmt(t.estimate, { credits: plural(credits, c.creditsOne, c.credits), minutes: fmt(ch.minutes, { count: minutes }) }) : ch.estimateEmpty}</span>
          </div>
          <JobProgress job={job.job} onCancel={job.cancel} />
        </section>
      )}
      <section aria-labelledby={`${id}-list`} className="grid gap-3">
        <h2 id={`${id}-list`} className="text-[20px] font-semibold">{t.list}</h2>
        {list.isLoading ? <div className="m-skeleton h-16" aria-hidden="true" />
          : list.isError ? <FormMessage>{c.networkError} <button type="button" className="link" onClick={() => list.refetch()}>{c.retry}</button></FormMessage>
          : !items.length ? <p className="app-empty">{t.empty}</p>
          : (
            <ul className="grid gap-2">
              {items.map((it) => (
                <li key={it.id} className="m-card flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    {it.status === 'succeeded'
                      ? <Link href={`/app/transcripts/${it.id}`} className="block truncate font-semibold hover:underline">{it.title || t.textLabel}</Link>
                      : <span className="block truncate font-semibold">{it.title || t.textLabel}</span>}
                    <p className="text-[13px] text-[var(--text-muted)]">
                      {fmt(t.item, { duration: it.durationMs ? formatTime(it.durationMs / 1000) : '—', date: new Date(it.createdAt).toLocaleString() })}
                      {it.language ? ` · ${languageName(it.language)}` : ''}
                    </p>
                  </div>
                  {it.status === 'failed' ? <span className="m-badge text-[var(--danger)]">{t.failed}</span>
                    : it.status !== 'succeeded' ? <span className="m-badge">{t.processing}</span>
                    : <Link href={`/app/transcripts/${it.id}`} className="m-btn secondary sm" aria-label={`${t.open}: ${it.title}`}>{t.open}</Link>}
                </li>
              ))}
            </ul>
          )}
        {list.hasNextPage ? <button type="button" className="m-btn secondary justify-self-center" disabled={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>{c.loadMore}</button> : null}
      </section>
    </div>
  )
}
