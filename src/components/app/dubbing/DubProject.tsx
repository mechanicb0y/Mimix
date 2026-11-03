'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, RefreshCw, Trash2 } from 'lucide-react'
import { Tabs } from 'radix-ui'
import { useEffect, useId, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { useJob } from '@/lib/use-job'
import { getMessages, fmt, plural } from '@/i18n'
import { languageName } from '@/config/languages'
import { DUB_LINE_MAX } from '@/lib/schemas/dubbing'
import type { Segment } from '@/lib/transcript-format'
import { FormMessage } from '@/components/app/Field'
import { VoicePicker } from '@/components/app/VoicePicker'
import { OverQuota } from '@/components/app/OverQuota'
import { JobProgress } from '@/components/app/JobProgress'
import { formatTime } from '@/components/ui/AudioPlayer'
import { useAppContext } from '@/components/app/shell/context'
import type { DubSummary } from './DubbingHome'

interface DubOutputView { status: 'pending' | 'rendering' | 'done' | 'failed'; error?: string | null; segments: Segment[]; generationId?: string | null; rerenderCredits: number; audioUrl: string | null; downloadUrl: string | null; videoUrl: string | null }
interface Dub extends DubSummary { keepBackground: boolean; segments: Segment[]; cast: Record<string, string>; sourceUrl: string | null; outputs: Record<string, DubOutputView> }

export function DubProject({ id, canEdit }: { id: string; canEdit: boolean }) {
  const t = getMessages().app.dubbing
  const c = getMessages().app.common
  const qc = useQueryClient()
  const router = useRouter()
  const q = useQuery({ queryKey: ['dub', id], queryFn: () => api<Dub>(`/api/v1/dubbing/${id}`) })
  const p = q.data
  const job = useJob(() => { void q.refetch(); void qc.invalidateQueries({ queryKey: ['dubs'] }); router.refresh() })
  const following = job.job?.id
  const jobId = p?.jobId ?? null
  const start = job.start
  useEffect(() => { if (jobId && jobId !== following) start(jobId) }, [jobId, following, start])
  const [tab, setTab] = useState<string | null>(null)
  const del = useMutation({
    mutationFn: () => api(`/api/v1/dubbing/${id}`, { method: 'DELETE' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['dubs'] }); router.push('/app/dubbing') },
  })

  const back = <Link href="/app/dubbing" className="m-btn ghost sm justify-self-start"><ArrowLeft aria-hidden="true" />{t.back}</Link>
  if (q.isLoading) return <div className="mx-auto grid max-w-[1100px] gap-4">{back}<div className="m-skeleton h-40" aria-hidden="true" /></div>
  if (q.isError || !p) {
    const notFound = q.error instanceof ApiClientError && q.error.status === 404
    return <div className="mx-auto grid max-w-[1100px] gap-4">{back}<FormMessage>{notFound ? t.notFound : <>{c.networkError} <button type="button" className="link" onClick={() => q.refetch()}>{c.retry}</button></>}</FormMessage></div>
  }
  const busy = !!p.jobId || p.status === 'transcribing' || p.status === 'rendering'
  const active = tab ?? p.targetLanguages[0]!
  const ready = p.status === 'done' || (p.status === 'rendering' && Object.values(p.outputs).some((o) => o.status === 'done'))

  return (
    <div className="mx-auto grid max-w-[1100px] gap-6">
      {back}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="app-page-title break-words">{p.title}</h1>
          <p className="mt-1 text-[var(--text-muted)]">
            {fmt(t.item, { duration: p.durationMs ? formatTime(p.durationMs / 1000) : '—', languages: p.targetLanguages.map((l) => languageName(l)).join(', '), date: new Date(p.createdAt).toLocaleString() })}
          </p>
        </div>
        <span className={`m-badge ${p.status === 'failed' ? 'text-[var(--danger)]' : ''}`}>{t.status[p.status]}</span>
      </header>

      {p.status === 'failed' ? <FormMessage>{fmt(t.failedBody, { error: p.error ?? '' })}</FormMessage> : null}
      {busy ? (
        <section className="m-card grid gap-3 p-4 sm:p-6" aria-label={t.status[p.status]}>
          <p>{t.working}</p>
          <JobProgress job={job.job} onCancel={canEdit && p.status === 'transcribing' ? job.cancel : undefined} />
        </section>
      ) : null}

      {ready ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Tabs.Root value={active} onValueChange={setTab} className="grid min-w-0 content-start gap-4">
            <Tabs.List aria-label={t.targets} className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
              {p.targetLanguages.map((l) => (
                <Tabs.Trigger key={l} value={l} className="relative min-h-11 whitespace-nowrap px-3 text-[14px] font-semibold text-[var(--text-muted)] data-[state=active]:text-[var(--text)] data-[state=active]:after:absolute data-[state=active]:after:inset-x-3 data-[state=active]:after:bottom-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-[var(--primary)]">
                  {languageName(l)}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            {p.targetLanguages.map((l) => (
              <Tabs.Content key={l} value={l} className="outline-none">
                {p.outputs[l] ? <LanguagePanel key={`${l}-${p.outputs[l]!.generationId ?? ''}-${p.outputs[l]!.status}`} p={p} lang={l} out={p.outputs[l]!} canEdit={canEdit && !busy} onRendered={(jid) => { void q.refetch(); job.start(jid) }} /> : null}
              </Tabs.Content>
            ))}
          </Tabs.Root>
          <aside className="grid content-start gap-4">
            <CastPanel key={JSON.stringify(p.cast)} p={p} canEdit={canEdit && !busy} />
            {canEdit ? (
              <button type="button" className="m-btn ghost justify-self-start text-[var(--danger)]" disabled={del.isPending || busy}
                onClick={() => { if (window.confirm(t.deleteConfirm)) del.mutate() }}>
                <Trash2 aria-hidden="true" />{del.isPending ? c.deleting : c.delete}
              </button>
            ) : null}
            {del.error ? <FormMessage>{del.error.message}</FormMessage> : null}
          </aside>
        </div>
      ) : canEdit && p.status === 'failed' ? (
        <button type="button" className="m-btn ghost justify-self-start text-[var(--danger)]" disabled={del.isPending} onClick={() => { if (window.confirm(t.deleteConfirm)) del.mutate() }}>
          <Trash2 aria-hidden="true" />{c.delete}
        </button>
      ) : null}
    </div>
  )
}

function LanguagePanel({ p, lang, out, canEdit, onRendered }: { p: Dub; lang: string; out: DubOutputView; canEdit: boolean; onRendered: (jobId: string) => void }) {
  const t = getMessages().app.dubbing
  const c = getMessages().app.common
  const uid = useId()
  const ctx = useAppContext()
  const qc = useQueryClient()
  const [lines, setLines] = useState(out.segments)
  const [saved, setSaved] = useState(false)
  const dirty = lines.some((s, i) => s.text !== out.segments[i]?.text)
  const save = useMutation({
    mutationFn: () => api<Dub>(`/api/v1/dubbing/${p.id}`, { method: 'PATCH', json: { language: lang, segments: lines } }),
    onSuccess: (d) => { qc.setQueryData(['dub', p.id], d); setSaved(true) },
  })
  const render = useMutation({
    mutationFn: () => api<{ id: string }>(`/api/v1/dubbing/${p.id}/render`, { method: 'POST', json: { language: lang } }),
    onSuccess: (j) => onRendered(j.id),
  })
  const cost = out.rerenderCredits
  const notEnough = !ctx.balance.unlimited && cost > ctx.balance.total
  const renderErr = render.error instanceof ApiClientError ? render.error : null
  const capUrl = (language: string, format: 'srt' | 'vtt') => `/api/v1/dubbing/${p.id}/captions?language=${language}&format=${format}`

  return (
    <div className="grid gap-4">
      <section className="m-card grid gap-3 p-4 sm:p-6" aria-labelledby={`${uid}-play`}>
        <h2 id={`${uid}-play`} className="sr-only">{languageName(lang)}</h2>
        {out.status === 'failed' ? <FormMessage>{fmt(t.languageFailed, { error: out.error ?? '' })}</FormMessage> : null}
        {p.isVideo && out.videoUrl
          ? <video src={out.videoUrl} controls preload="metadata" className="aspect-video w-full rounded-[var(--radius-md)] bg-black" aria-label={`${p.title}, ${languageName(lang)}`} />
          : out.audioUrl ? <audio src={out.audioUrl} controls preload="metadata" className="w-full" aria-label={`${p.title}, ${languageName(lang)}`} /> : null}
        <div>
          <h3 className="m-label">{t.downloads}</h3>
          <div className="flex flex-wrap gap-2">
            {out.downloadUrl ? <a className="m-btn secondary sm" href={out.downloadUrl} download><Download aria-hidden="true" />{t.downloadAudio}</a> : null}
            {out.videoUrl ? <a className="m-btn secondary sm" href={out.videoUrl} download><Download aria-hidden="true" />{t.downloadVideo}</a> : null}
            <a className="m-btn secondary sm" href={capUrl(lang, 'srt')} download><Download aria-hidden="true" />{t.downloadSrt}</a>
            <a className="m-btn secondary sm" href={capUrl(lang, 'vtt')} download><Download aria-hidden="true" />{t.downloadVtt}</a>
            <a className="m-btn ghost sm" href={capUrl('source', 'srt')} download><Download aria-hidden="true" />{t.downloadSourceSrt}</a>
          </div>
        </div>
      </section>

      <form className="m-card grid gap-3 p-4 sm:p-6" noValidate aria-labelledby={`${uid}-lines`} onSubmit={(e) => { e.preventDefault(); setSaved(false); save.mutate() }}>
        <h2 id={`${uid}-lines`} className="text-[16px] font-semibold">{t.translation}</h2>
        <ol className="grid gap-3">
          {lines.map((s, i) => {
            const orig = p.segments[i]
            const label = fmt(t.lineLabel, { n: i + 1, speaker: s.speaker, time: formatTime(s.startMs / 1000) })
            return (
              <li key={i} className="grid gap-2 border-b border-[var(--border)] pb-3 last:border-0 md:grid-cols-2">
                <div className="grid content-start gap-1">
                  <p className="text-[12px] text-[var(--text-subtle)]"><span className="font-mono">{formatTime(s.startMs / 1000)}</span> · {s.speaker}</p>
                  <p className="text-[14px] text-[var(--text-muted)]" lang={p.sourceLanguage}>{orig?.text}</p>
                </div>
                <label className="grid gap-1">
                  <span className="sr-only">{label}</span>
                  <textarea className="m-textarea min-h-[64px] text-[14px]" lang={lang} value={s.text} maxLength={DUB_LINE_MAX} readOnly={!canEdit} rows={2}
                    onChange={(e) => { const v = e.target.value; setLines((cur) => cur.map((x, k) => (k === i ? { ...x, text: v } : x))); setSaved(false) }} />
                </label>
              </li>
            )
          })}
        </ol>
        {save.error ? <FormMessage>{save.error.message}</FormMessage> : null}
        <p className="sr-only" role="status" aria-live="polite">{saved ? t.linesSaved : ''}</p>
        {saved && !dirty ? <FormMessage tone="success">{t.linesSaved}</FormMessage> : dirty ? <p className="m-hint">{t.unsaved}</p> : null}
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="m-btn secondary" disabled={!dirty || save.isPending} aria-busy={save.isPending}>{save.isPending ? c.saving : t.saveLines}</button>
            <button type="button" className="m-btn primary" disabled={dirty || render.isPending || (cost === 0 && out.status === 'done') || notEnough} onClick={() => render.mutate()}>
              <RefreshCw aria-hidden="true" />{render.isPending ? t.rendering : fmt(t.render, { language: languageName(lang) })}
            </button>
            <span className="text-[13px] text-[var(--text-muted)]">{cost > 0 ? fmt(t.renderCost, { credits: plural(cost, c.creditsOne, c.credits) }) : out.status === 'done' ? t.upToDate : ''}</span>
          </div>
        ) : null}
        {notEnough ? <OverQuota needed={cost} available={ctx.balance.total} /> : null}
        {renderErr?.code === 'insufficient_credits' ? <OverQuota needed={Number(renderErr.extra.needed)} available={Number(renderErr.extra.available)} />
          : renderErr ? <FormMessage>{renderErr.message}</FormMessage> : null}
      </form>
    </div>
  )
}

function CastPanel({ p, canEdit }: { p: Dub; canEdit: boolean }) {
  const t = getMessages().app.dubbing
  const c = getMessages().app.common
  const uid = useId()
  const qc = useQueryClient()
  const [cast, setCast] = useState(p.cast)
  const [saved, setSaved] = useState(false)
  const speakers = Object.keys(p.cast)
  const dirty = speakers.some((s) => cast[s] !== p.cast[s])
  const save = useMutation({
    mutationFn: () => api<Dub>(`/api/v1/dubbing/${p.id}`, { method: 'PATCH', json: { cast } }),
    onSuccess: (d) => { setSaved(true); qc.setQueryData(['dub', p.id], d) },
  })
  const fields = save.error instanceof ApiClientError ? save.error.fields : {}
  return (
    <form className="m-card grid gap-3 p-4 sm:p-6" noValidate aria-labelledby={`${uid}-cast`} onSubmit={(e) => { e.preventDefault(); setSaved(false); save.mutate() }}>
      <h2 id={`${uid}-cast`} className="text-[16px] font-semibold">{t.cast}</h2>
      <p className="m-hint -mt-1">{t.castHint}</p>
      {speakers.map((s) => (
        <VoicePicker key={s} id={`${uid}-${s.replace(/\W+/g, '')}`} label={fmt(t.voiceFor, { speaker: s })} value={cast[s] ?? null} onChange={(v) => { setCast({ ...cast, [s]: v }); setSaved(false) }} error={fields[`cast.${s}`]} />
      ))}
      {save.error && !Object.keys(fields).length ? <FormMessage>{save.error.message}</FormMessage> : null}
      <p className="sr-only" role="status" aria-live="polite">{saved ? t.castSaved : ''}</p>
      {saved && !dirty ? <FormMessage tone="success">{t.castSaved}</FormMessage> : null}
      {canEdit ? <button type="submit" className="m-btn secondary justify-self-start" disabled={!dirty || save.isPending} aria-busy={save.isPending}>{save.isPending ? c.saving : t.saveCast}</button> : null}
    </form>
  )
}
