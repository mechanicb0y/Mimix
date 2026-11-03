'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Eraser } from 'lucide-react'
import { useState } from 'react'
import { ToggleGroup } from 'radix-ui'
import { api, ApiClientError } from '@/lib/api-client'
import { useJob } from '@/lib/use-job'
import { getMessages, fmt, plural } from '@/i18n'
import { CREDIT_RATES } from '@/config/plans'
import { FormMessage } from '@/components/app/Field'
import { MediaInput, type ReadyMedia } from '@/components/app/MediaInput'
import { OverQuota } from '@/components/app/OverQuota'
import { JobProgress } from '@/components/app/JobProgress'
import { GenerationPlayer } from '@/components/app/GenerationPlayer'
import { useAppContext } from '@/components/app/shell/context'
import { GenerationHistory, type HistoryGen } from './GenerationHistory'

export function IsolatorStudio({ maxMs, canGenerate }: { maxMs: number; canGenerate: boolean }) {
  const t = getMessages().app.isolator
  const c = getMessages().app.common
  const ch = getMessages().app.changer
  const ctx = useAppContext()
  const qc = useQueryClient()
  const router = useRouter()
  const [media, setMedia] = useState<ReadyMedia | null>(null)
  const [name, setName] = useState('')
  const [format, setFormat] = useState<'mp3' | 'wav'>('mp3')
  const [error, setError] = useState<ApiClientError | null>(null)
  const [result, setResult] = useState<HistoryGen | null>(null)

  const job = useJob(async (j) => {
    if (j.status === 'succeeded') {
      setResult(await api<HistoryGen>(`/api/v1/history/${String(j.output?.generationId)}`))
      void qc.invalidateQueries({ queryKey: ['history', 'isolator'] })
    }
    router.refresh()
  }, { resume: { types: ['isolator'] } })

  const minutes = media ? Math.max(1, Math.ceil(media.durationMs / 60_000)) : 0
  const credits = minutes * CREDIT_RATES.isolatorPerMinute
  const notEnough = !!media && !ctx.balance.unlimited && credits > ctx.balance.total

  const run = async () => {
    if (!media) return
    setError(null); setResult(null)
    try {
      const j = await api<{ id: string }>('/api/v1/voice-isolator', { method: 'POST', json: { uploadId: media.uploadId, format, declaredMs: media.durationMs } })
      setName(media.name)
      job.start(j.id)
      setMedia(null)
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
      {!canGenerate ? <FormMessage tone="info">{c.viewerReadOnly}</FormMessage> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="m-card grid content-start gap-4 p-4 sm:p-6" aria-label={t.title}>
          <MediaInput value={media} onChange={setMedia} maxMs={maxMs} error={error?.fields.uploadId} />
          {notEnough ? <OverQuota needed={credits} available={ctx.balance.total} /> : null}
          {error?.code === 'insufficient_credits' ? <OverQuota needed={Number(error.extra.needed)} available={Number(error.extra.available)} /> : null}
          {error && error.code !== 'insufficient_credits' && !Object.keys(error.fields).length ? <FormMessage>{error.message}</FormMessage> : null}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="m-btn primary lg" onClick={run} disabled={!canGenerate || !media || notEnough || job.active}>
              <Eraser aria-hidden="true" />{job.active ? t.running : t.run}
            </button>
            <span className="text-[13px] text-[var(--text-muted)]">{media ? fmt(t.estimate, { credits: plural(credits, c.creditsOne, c.credits), minutes: fmt(ch.minutes, { count: minutes }) }) : ch.estimateEmpty}</span>
          </div>
          <JobProgress job={job.job} onCancel={job.cancel} />
          {result ? (
            <div className="grid gap-2 border-t border-[var(--border)] pt-4">
              <h2 className="text-[15px] font-semibold">{t.result}</h2>
              <p className="sr-only" role="status">{t.ready}</p>
              <GenerationPlayer g={result} title={name ? `${name}: ${t.result}` : t.result} />
            </div>
          ) : null}
        </section>
        <aside className="m-card grid content-start gap-5 p-4 sm:p-6" aria-label={c.more}>
          <div>
            <span className="m-label" id="iso-format">{ch.format}</span>
            <ToggleGroup.Root type="single" className="seg" aria-labelledby="iso-format" value={format} onValueChange={(v) => v && setFormat(v as 'mp3' | 'wav')}>
              <ToggleGroup.Item value="mp3" className="seg-item">MP3</ToggleGroup.Item>
              <ToggleGroup.Item value="wav" className="seg-item">WAV</ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>
        </aside>
      </div>
      <GenerationHistory module="isolator" title={t.history} empty={t.historyEmpty} label={() => t.result} />
    </div>
  )
}
