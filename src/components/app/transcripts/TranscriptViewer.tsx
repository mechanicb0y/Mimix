'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Trash2 } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages, fmt } from '@/i18n'
import { languageName } from '@/config/languages'
import type { Segment } from '@/lib/transcript-format'
import { FormMessage, TextInput } from '@/components/app/Field'
import { formatTime } from '@/components/ui/AudioPlayer'

interface Transcript {
  id: string; status: string; title: string; language: string | null; durationMs: number | null; credits: number; createdAt: string
  audioUrl: string | null; error: string | null; segments: Segment[]; speakerNames: Record<string, string>
}

export function TranscriptViewer({ id, canEdit }: { id: string; canEdit: boolean }) {
  const t = getMessages().app.stt
  const c = getMessages().app.common
  const uid = useId()
  const qc = useQueryClient()
  const router = useRouter()
  const audio = useRef<HTMLAudioElement>(null)
  const [now, setNow] = useState(-1)
  const q = useQuery({
    queryKey: ['transcript', id],
    queryFn: () => api<Transcript>(`/api/v1/transcripts/${id}`),
    refetchInterval: (query) => (query.state.data && ['queued', 'running'].includes(query.state.data.status) ? 3000 : false),
  })
  const tr = q.data
  const [timestamps, setTimestamps] = useState(true)
  const [withSpeakers, setWithSpeakers] = useState(true)
  const del = useMutation({
    mutationFn: () => api(`/api/v1/transcripts/${id}`, { method: 'DELETE' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['transcripts'] }); router.push('/app/transcripts') },
  })

  const onTime = () => {
    const ms = (audio.current?.currentTime ?? 0) * 1000
    setNow(tr?.segments.findIndex((s) => ms >= s.startMs && ms < s.endMs) ?? -1)
  }
  const jump = (ms: number) => {
    const a = audio.current
    if (!a) return
    a.currentTime = ms / 1000
    void a.play()
  }
  const exportUrl = (format: 'txt' | 'srt' | 'vtt') =>
    `/api/v1/transcripts/${id}?format=${format}${format === 'txt' && timestamps ? '&timestamps=1' : ''}${withSpeakers ? '' : '&speakers=0'}`
  const display = (s: string) => tr?.speakerNames[s]?.trim() || s

  const back = <Link href="/app/transcripts" className="m-btn ghost sm justify-self-start"><ArrowLeft aria-hidden="true" />{t.back}</Link>
  if (q.isLoading) return <div className="mx-auto grid max-w-[1100px] gap-4">{back}<div className="m-skeleton h-40" aria-hidden="true" /></div>
  if (q.isError || !tr) {
    const notFound = q.error instanceof ApiClientError && q.error.status === 404
    return (
      <div className="mx-auto grid max-w-[1100px] gap-4">{back}
        <FormMessage>{notFound ? t.notFound : <>{c.networkError} <button type="button" className="link" onClick={() => q.refetch()}>{c.retry}</button></>}</FormMessage>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-[1100px] gap-6">
      {back}
      <header>
        <h1 className="app-page-title break-words">{tr.title || t.textLabel}</h1>
        <p className="mt-1 text-[var(--text-muted)]">
          {fmt(t.item, { duration: tr.durationMs ? formatTime(tr.durationMs / 1000) : '—', date: new Date(tr.createdAt).toLocaleString() })}
          {tr.language ? ` · ${languageName(tr.language)}` : ''}
        </p>
      </header>
      {tr.status === 'failed' ? <FormMessage>{fmt(t.failedBody, { error: tr.error ?? '' })}</FormMessage>
        : tr.status !== 'succeeded' ? <FormMessage tone="info">{t.stillWorking}</FormMessage>
        : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="m-card grid content-start gap-4 self-start p-4 sm:p-6" aria-labelledby={`${uid}-text`}>
              <h2 id={`${uid}-text`} className="sr-only">{t.textLabel}</h2>
              {tr.audioUrl ? <audio ref={audio} src={tr.audioUrl} controls preload="metadata" className="w-full" onTimeUpdate={onTime} aria-label={tr.title} /> : null}
              {!tr.segments.length ? <p className="app-empty">{t.noSegments}</p> : (
                <ol className="grid gap-1">
                  {tr.segments.map((s, i) => (
                    <li key={i} className={`grid gap-1 rounded-[var(--radius-md)] p-2 sm:grid-cols-[96px_minmax(0,1fr)] ${i === now ? 'bg-[var(--surface-2)]' : ''}`} aria-current={i === now ? 'true' : undefined}>
                      <button type="button" className="link justify-self-start font-mono text-[13px]" onClick={() => jump(s.startMs)} aria-label={fmt(t.jumpTo, { time: formatTime(s.startMs / 1000) })} disabled={!tr.audioUrl}>
                        {formatTime(s.startMs / 1000)}
                      </button>
                      <p className="text-[15px] leading-6"><span className="font-semibold">{display(s.speaker)}: </span>{s.text}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <aside className="grid content-start gap-4">
              <section className="m-card grid gap-3 p-4 sm:p-6" aria-labelledby={`${uid}-exp`}>
                <h2 id={`${uid}-exp`} className="text-[16px] font-semibold">{t.export}</h2>
                <label className="flex items-center gap-3 text-[14px]"><input type="checkbox" className="size-5 accent-[var(--primary)]" checked={timestamps} onChange={(e) => setTimestamps(e.target.checked)} />{t.includeTimestamps}</label>
                <label className="flex items-center gap-3 text-[14px]"><input type="checkbox" className="size-5 accent-[var(--primary)]" checked={withSpeakers} onChange={(e) => setWithSpeakers(e.target.checked)} />{t.includeSpeakers}</label>
                <div className="grid gap-2">
                  <a className="m-btn secondary" href={exportUrl('txt')} download><Download aria-hidden="true" />{t.exportTxt}</a>
                  <a className="m-btn secondary" href={exportUrl('srt')} download><Download aria-hidden="true" />{t.exportSrt}</a>
                  <a className="m-btn secondary" href={exportUrl('vtt')} download><Download aria-hidden="true" />{t.exportVtt}</a>
                </div>
              </section>
              {canEdit ? <RenameForm key={tr.id} tr={tr} /> : null}
              {canEdit ? (
                <button type="button" className="m-btn ghost justify-self-start text-[var(--danger)]" disabled={del.isPending}
                  onClick={() => { if (window.confirm(t.deleteConfirm)) del.mutate() }}>
                  <Trash2 aria-hidden="true" />{del.isPending ? c.deleting : c.delete}
                </button>
              ) : null}
              {del.error ? <FormMessage>{del.error.message}</FormMessage> : null}
            </aside>
          </div>
        )}
    </div>
  )
}

function RenameForm({ tr }: { tr: Transcript }) {
  const t = getMessages().app.stt
  const c = getMessages().app.common
  const uid = useId()
  const qc = useQueryClient()
  const [title, setTitle] = useState(tr.title)
  const [names, setNames] = useState<Record<string, string>>(tr.speakerNames)
  const [saved, setSaved] = useState(false)
  const speakers = useMemo(() => [...new Set(tr.segments.map((s) => s.speaker))], [tr])
  const save = useMutation({
    mutationFn: () => api<Transcript>(`/api/v1/transcripts/${tr.id}`, { method: 'PATCH', json: { title, speakerNames: Object.fromEntries(speakers.map((s) => [s, names[s] ?? ''])) } }),
    onSuccess: (d) => { qc.setQueryData(['transcript', tr.id], d); setSaved(true); void qc.invalidateQueries({ queryKey: ['transcripts'] }) },
  })
  const fields = save.error instanceof ApiClientError ? save.error.fields : {}
  return (
    <form className="m-card grid gap-3 p-4 sm:p-6" noValidate aria-labelledby={`${uid}-ren`} onSubmit={(e) => { e.preventDefault(); setSaved(false); save.mutate() }}>
      <h2 id={`${uid}-ren`} className="text-[16px] font-semibold">{t.rename}</h2>
      <p className="m-hint -mt-1">{t.renameHint}</p>
      <TextInput label={t.titleLabel} value={title} onChange={(e) => { setTitle(e.target.value); setSaved(false) }} maxLength={120} error={fields.title} />
      {speakers.map((s) => (
        <TextInput key={s} label={fmt(t.speakerOf, { speaker: s })} value={names[s] ?? ''} placeholder={s} maxLength={60}
          onChange={(e) => { setNames({ ...names, [s]: e.target.value }); setSaved(false) }} error={fields[`speakerNames.${s}`]} />
      ))}
      {save.error && !Object.keys(fields).length ? <FormMessage>{save.error.message}</FormMessage> : null}
      <p className="sr-only" role="status" aria-live="polite">{saved ? t.saved : ''}</p>
      {saved ? <FormMessage tone="success">{t.saved}</FormMessage> : null}
      <button type="submit" className="m-btn primary justify-self-start" disabled={save.isPending} aria-busy={save.isPending}>{save.isPending ? c.saving : c.save}</button>
    </form>
  )
}
