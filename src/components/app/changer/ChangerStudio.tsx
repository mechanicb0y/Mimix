'use client'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Repeat } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ToggleGroup } from 'radix-ui'
import { api, ApiClientError } from '@/lib/api-client'
import { useJob } from '@/lib/use-job'
import { getMessages, fmt, plural } from '@/i18n'
import { CREDIT_RATES } from '@/config/plans'
import { FormMessage } from '@/components/app/Field'
import { MediaInput, type ReadyMedia } from '@/components/app/MediaInput'
import { VoicePicker, useUsableVoices } from '@/components/app/VoicePicker'
import { OverQuota } from '@/components/app/OverQuota'
import { JobProgress } from '@/components/app/JobProgress'
import { GenerationPlayer, type GenerationLike } from '@/components/app/GenerationPlayer'
import { useAppContext } from '@/components/app/shell/context'

interface Gen extends GenerationLike { voiceId: string | null; credits: number; createdAt: string }

export function ChangerStudio({ maxMs, canGenerate }: { maxMs: number; canGenerate: boolean }) {
  const t = getMessages().app.changer
  const c = getMessages().app.common
  const ctx = useAppContext()
  const qc = useQueryClient()
  const router = useRouter()
  const [media, setMedia] = useState<ReadyMedia | null>(null)
  const [voiceId, setVoiceId] = useState<string | null>('lib_atlas')
  const [format, setFormat] = useState<'mp3' | 'wav'>('mp3')
  const [clean, setClean] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<ApiClientError | null>(null)
  const [result, setResult] = useState<Gen | null>(null)
  const voices = useUsableVoices()
  const voiceName = (id: string | null) => [...(voices.data?.own ?? []), ...(voices.data?.others ?? [])].find((v) => v.id === id)?.name ?? ''

  const job = useJob(async (j) => {
    if (j.status === 'succeeded') {
      setResult(await api<Gen>(`/api/v1/history/${String(j.output?.generationId)}`))
      void qc.invalidateQueries({ queryKey: ['history', 'changer'] })
    }
    router.refresh()
  }, { resume: { types: ['changer'] } })
  const history = useInfiniteQuery({
    queryKey: ['history', 'changer'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api<{ items: Gen[]; nextBefore: string | null }>(`/api/v1/history?module=changer&limit=10${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ''}`),
    getNextPageParam: (last) => last.nextBefore,
  })
  const items = useMemo(() => history.data?.pages.flatMap((p) => p.items) ?? [], [history.data])

  const minutes = media ? Math.max(1, Math.ceil(media.durationMs / 60_000)) : 0
  const credits = minutes * CREDIT_RATES.changerPerMinute
  const notEnough = !!media && !ctx.balance.unlimited && credits > ctx.balance.total

  const run = async () => {
    if (!media || !voiceId) return
    setFields({}); setError(null); setResult(null)
    try {
      const j = await api<{ id: string }>('/api/v1/voice-changer', { method: 'POST', json: { uploadId: media.uploadId, voiceId, format, removeBackground: clean, declaredMs: media.durationMs } })
      job.start(j.id)
      setMedia(null)
    } catch (e) {
      if (e instanceof ApiClientError) { setError(e); setFields(e.fields) }
    }
  }

  return (
    <div className="mx-auto grid max-w-[1100px] gap-6">
      <header>
        <h1 className="app-page-title">{t.title}</h1>
        <p className="mt-1 text-[var(--text-muted)]">{t.subtitle}</p>
      </header>
      {!canGenerate ? <FormMessage tone="info">{c.viewerReadOnly}</FormMessage> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="m-card grid content-start gap-4 p-4 sm:p-6" aria-label={t.title}>
          <MediaInput value={media} onChange={setMedia} maxMs={maxMs} error={fields.uploadId} />
          <p className="m-hint">{t.rights}</p>
          {notEnough ? <OverQuota needed={credits} available={ctx.balance.total} /> : null}
          {error?.code === 'insufficient_credits' ? <OverQuota needed={Number(error.extra.needed)} available={Number(error.extra.available)} /> : null}
          {error && error.code !== 'insufficient_credits' && !Object.keys(error.fields).length ? <FormMessage>{error.message}</FormMessage> : null}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="m-btn primary lg" onClick={run} disabled={!canGenerate || !media || !voiceId || notEnough || job.active}>
              <Repeat aria-hidden="true" />{job.active ? t.converting : t.convert}
            </button>
            <span className="text-[13px] text-[var(--text-muted)]">{media ? fmt(t.estimate, { credits: plural(credits, c.creditsOne, c.credits), minutes: fmt(t.minutes, { count: minutes }) }) : t.estimateEmpty}</span>
          </div>
          <JobProgress job={job.job} onCancel={job.cancel} />
          {result ? (
            <div className="grid gap-2 border-t border-[var(--border)] pt-4">
              <h2 className="text-[15px] font-semibold">{t.result}</h2>
              <p className="sr-only" role="status">{t.ready}</p>
              <GenerationPlayer g={result} title={`${voiceName(result.voiceId)}: ${t.result}`} />
            </div>
          ) : null}
        </section>
        <aside className="m-card grid content-start gap-5 p-4 sm:p-6" aria-label={c.more}>
          <VoicePicker id="chg-voice" label={t.voice} value={voiceId} onChange={(id) => setVoiceId(id)} error={fields.voiceId} />
          <label className="flex items-center gap-3 text-[14px]"><input type="checkbox" className="size-5 accent-[var(--primary)]" checked={clean} onChange={(e) => setClean(e.target.checked)} />{t.removeBackground}</label>
          <div>
            <span className="m-label" id="chg-format">{t.format}</span>
            <ToggleGroup.Root type="single" className="seg" aria-labelledby="chg-format" value={format} onValueChange={(v) => v && setFormat(v as 'mp3' | 'wav')}>
              <ToggleGroup.Item value="mp3" className="seg-item">MP3</ToggleGroup.Item>
              <ToggleGroup.Item value="wav" className="seg-item">WAV</ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>
        </aside>
      </div>
      <section aria-labelledby="chg-history" className="grid gap-3">
        <h2 id="chg-history" className="text-[20px] font-semibold">{t.history}</h2>
        {history.isLoading ? <div className="m-skeleton h-16" aria-hidden="true" />
          : history.isError ? <FormMessage>{c.networkError} <button type="button" className="link" onClick={() => history.refetch()}>{c.retry}</button></FormMessage>
          : items.length === 0 ? <p className="app-empty">{t.historyEmpty}</p>
          : (
            <ul className="grid gap-2">
              {items.map((g) => (
                <li key={g.id} className="m-card grid gap-2 p-4">
                  <p className="text-[12px] text-[var(--text-subtle)]">{voiceName(g.voiceId) || '—'} · {new Date(g.createdAt).toLocaleString()} · {plural(g.credits, c.creditsOne, c.credits)}</p>
                  <GenerationPlayer g={g} title={`${voiceName(g.voiceId)}: ${new Date(g.createdAt).toLocaleString()}`} />
                </li>
              ))}
            </ul>
          )}
        {history.hasNextPage ? <button type="button" className="m-btn secondary justify-self-center" onClick={() => history.fetchNextPage()}>{c.loadMore}</button> : null}
      </section>
    </div>
  )
}
