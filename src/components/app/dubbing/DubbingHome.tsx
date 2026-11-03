'use client'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Languages, Lock } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages, fmt, plural } from '@/i18n'
import { CREDIT_RATES } from '@/config/plans'
import { FORM_LANGUAGES, languageName } from '@/config/languages'
import { DUB_MAX_TARGETS, DUB_TITLE_MAX } from '@/lib/schemas/dubbing'
import { FormMessage, TextInput } from '@/components/app/Field'
import { MediaInput, type ReadyMedia } from '@/components/app/MediaInput'
import { OverQuota } from '@/components/app/OverQuota'
import { formatTime } from '@/components/ui/AudioPlayer'
import { useAppContext } from '@/components/app/shell/context'

export interface DubSummary { id: string; title: string; status: keyof ReturnType<typeof getMessages>['app']['dubbing']['status']; sourceLanguage: string; targetLanguages: string[]; durationMs: number; isVideo: boolean; jobId: string | null; error: string | null; createdAt: string }

export function DubbingHome({ maxMs, canGenerate, canDub }: { maxMs: number; canGenerate: boolean; canDub: boolean }) {
  const t = getMessages().app.dubbing
  const c = getMessages().app.common
  const ch = getMessages().app.changer
  const id = useId()
  const ctx = useAppContext()
  const qc = useQueryClient()
  const router = useRouter()
  const [media, setMedia] = useState<ReadyMedia | null>(null)
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [targets, setTargets] = useState<string[]>([])
  const [speakers, setSpeakers] = useState('')
  const [keepBackground, setKeepBackground] = useState(true)
  const [error, setError] = useState<ApiClientError | null>(null)
  const [busy, setBusy] = useState(false)

  const list = useInfiniteQuery({
    queryKey: ['dubs'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api<{ items: DubSummary[]; nextBefore: string | null }>(`/api/v1/dubbing?limit=20${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ''}`),
    getNextPageParam: (last) => last.nextBefore,
    refetchInterval: (q) => (q.state.data?.pages.some((p) => p.items.some((i) => i.jobId)) ? 5000 : false),
  })
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data])

  const minutes = media ? Math.max(1, Math.ceil(media.durationMs / 60_000)) : 0
  const credits = minutes * targets.length * CREDIT_RATES.dubbingPerMinute
  const notEnough = !!media && targets.length > 0 && !ctx.balance.unlimited && credits > ctx.balance.total
  const toggle = (l: string) => setTargets((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : cur.length >= DUB_MAX_TARGETS ? cur : [...cur, l]))

  const run = async () => {
    if (!media) return
    setError(null); setBusy(true)
    try {
      const r = await api<{ project: { id: string }; jobId: string }>('/api/v1/dubbing', {
        method: 'POST',
        json: { uploadId: media.uploadId, title: title.trim() || undefined, sourceLanguage: source || undefined, targetLanguages: targets, speakers: speakers ? Number(speakers) : undefined, keepBackground, declaredMs: media.durationMs },
      })
      void qc.invalidateQueries({ queryKey: ['dubs'] })
      router.push(`/app/dubbing/${r.project.id}`)
    } catch (e) {
      if (e instanceof ApiClientError) setError(e)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-[1100px] gap-6">
      <header>
        <h1 className="app-page-title">{t.title}</h1>
        <p className="mt-1 text-[var(--text-muted)]">{t.subtitle}</p>
      </header>
      {!canGenerate ? <FormMessage tone="info">{c.viewerReadOnly}</FormMessage>
        : !canDub ? (
          <div className="m-card flex flex-wrap items-center gap-3 p-4 sm:p-6">
            <Lock aria-hidden="true" className="size-5 text-[var(--text-muted)]" />
            <p className="flex-1">{t.locked}</p>
            <Link href="/app/settings/billing" className="m-btn primary">{t.seePlans}</Link>
          </div>
        ) : (
          <section className="m-card grid gap-5 p-4 sm:p-6" aria-labelledby={`${id}-new`}>
            <h2 id={`${id}-new`} className="text-[18px] font-semibold">{t.newTitle}</h2>
            <MediaInput value={media} onChange={setMedia} maxMs={maxMs} error={error?.fields.uploadId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label={t.projectTitle} hint={t.projectTitleHint} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={DUB_TITLE_MAX} error={error?.fields.title} />
              <div>
                <label htmlFor={`${id}-src`} className="m-label">{t.sourceLanguage}</label>
                <select id={`${id}-src`} className="m-select" value={source} onChange={(e) => { setSource(e.target.value); setTargets((cur) => cur.filter((x) => x !== e.target.value)) }}>
                  <option value="">{t.detect}</option>
                  {FORM_LANGUAGES.map((l) => <option key={l} value={l}>{languageName(l)}</option>)}
                </select>
              </div>
            </div>
            <fieldset aria-describedby={`${id}-tg-hint${error?.fields.targetLanguages ? ` ${id}-tg-err` : ''}`}>
              <legend className="m-label">{t.targets}</legend>
              <p id={`${id}-tg-hint`} className="m-hint -mt-1 mb-2">{fmt(t.targetsHint, { max: DUB_MAX_TARGETS })}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {FORM_LANGUAGES.filter((l) => l !== source).map((l) => {
                  const on = targets.includes(l)
                  return (
                    <label key={l} className={`flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border px-3 text-[14px] ${on ? 'border-[var(--primary)] bg-[var(--surface-2)]' : 'border-[var(--border)]'}`}>
                      <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={on} disabled={!on && targets.length >= DUB_MAX_TARGETS} onChange={() => toggle(l)} />
                      {languageName(l)}
                    </label>
                  )
                })}
              </div>
              {error?.fields.targetLanguages ? <p id={`${id}-tg-err`} className="m-error">{error.fields.targetLanguages}</p> : null}
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${id}-spk`} className="m-label">{t.speakers}</label>
                <select id={`${id}-spk`} className="m-select" value={speakers} onChange={(e) => setSpeakers(e.target.value)}>
                  <option value="">{t.speakersAuto}</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? getMessages().app.stt.speakersOne : fmt(getMessages().app.stt.speakersN, { count: n })}</option>)}
                </select>
              </div>
              <label className="flex items-start gap-3 text-[14px] sm:pt-7">
                <input type="checkbox" className="mt-0.5 size-5 accent-[var(--primary)]" checked={keepBackground} onChange={(e) => setKeepBackground(e.target.checked)} aria-describedby={`${id}-bg`} />
                <span>{t.keepBackground}<span id={`${id}-bg`} className="m-hint mt-1 block">{t.keepBackgroundHint}</span></span>
              </label>
            </div>
            <p className="m-hint">{t.voicesNote}</p>
            {notEnough ? <OverQuota needed={credits} available={ctx.balance.total} /> : null}
            {error?.code === 'insufficient_credits' ? <OverQuota needed={Number(error.extra.needed)} available={Number(error.extra.available)} /> : null}
            {error && error.code !== 'insufficient_credits' && !Object.keys(error.fields).length ? <FormMessage>{error.message}</FormMessage> : null}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="m-btn primary lg" onClick={run} disabled={!media || !targets.length || notEnough || busy} aria-busy={busy}>
                <Languages aria-hidden="true" />{busy ? t.starting : t.start}
              </button>
              <span className="text-[13px] text-[var(--text-muted)]">
                {media && targets.length
                  ? fmt(t.estimate, { credits: plural(credits, c.creditsOne, c.credits), minutes: fmt(ch.minutes, { count: minutes }), languages: targets.length === 1 ? t.languagesOne : fmt(t.languagesCount, { count: targets.length }) })
                  : t.estimateEmpty}
              </span>
            </div>
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
                    <Link href={`/app/dubbing/${it.id}`} className="block truncate font-semibold hover:underline">{it.title}</Link>
                    <p className="text-[13px] text-[var(--text-muted)]">
                      {fmt(t.item, { duration: it.durationMs ? formatTime(it.durationMs / 1000) : '—', languages: it.targetLanguages.map((l) => languageName(l)).join(', '), date: new Date(it.createdAt).toLocaleString() })}
                    </p>
                  </div>
                  <span className={`m-badge ${it.status === 'failed' ? 'text-[var(--danger)]' : ''}`}>{t.status[it.status]}</span>
                </li>
              ))}
            </ul>
          )}
        {list.hasNextPage ? <button type="button" className="m-btn secondary justify-self-center" disabled={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>{c.loadMore}</button> : null}
      </section>
    </div>
  )
}
