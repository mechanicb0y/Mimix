'use client'
import { useRouter } from 'next/navigation'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookA, RotateCcw, Trash2, Wand2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ToggleGroup } from 'radix-ui'
import { api, ApiClientError, type JobState } from '@/lib/api-client'
import { useJob } from '@/lib/use-job'
import { JobProgress } from '@/components/app/JobProgress'
import { TTS_MAX_CHARS, ttsCredits, type VoiceSettingsInput } from '@/lib/schemas/tts'
import { getMessages, fmt, formatNumber, plural } from '@/i18n'
import { FormMessage } from '@/components/app/Field'
import { SliderField } from '@/components/app/SliderField'
import { VoicePicker, useUsableVoices } from '@/components/app/VoicePicker'
import { OverQuota } from '@/components/app/OverQuota'
import { GenerationPlayer, type GenerationLike } from '@/components/app/GenerationPlayer'
import { useAppContext } from '@/components/app/shell/context'
import { formatTime } from '@/components/ui/AudioPlayer'
import { PronunciationDialog } from './PronunciationDialog'
import { ConfirmButton } from '@/components/app/Confirm'

const DEFAULTS: VoiceSettingsInput = { stability: 0.5, similarity: 0.75, style: 0, speed: 1 }
const DRAFT_KEY = 'mimix:tts-draft'

interface Generation extends GenerationLike { voiceId: string | null; model: string; credits: number; createdAt: string; settings: VoiceSettingsInput | null; status: string }

export function SpeechStudio({ models, ruleCount: initialRules, initialVoiceId, canGenerate }: { models: Array<{ id: string; name: string; default: boolean }>; ruleCount: number; initialVoiceId: string; canGenerate: boolean }) {
  const t = getMessages().app.speech
  const c = getMessages().app.common
  const ctx = useAppContext()
  const qc = useQueryClient()
  const router = useRouter()
  const [text, setText] = useState('')
  const [voiceId, setVoiceId] = useState<string | null>(initialVoiceId)
  const [model, setModel] = useState(models.find((m) => m.default)?.id ?? models[0]?.id ?? '')
  const [format, setFormat] = useState<'mp3' | 'wav'>('mp3')
  const [settings, setSettings] = useState<VoiceSettingsInput>(DEFAULTS)
  const [usePron, setUsePron] = useState(true)
  const [ruleCount, setRuleCount] = useState(initialRules)
  const [dictOpen, setDictOpen] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [latest, setLatest] = useState<Generation | null>(null)
  const [status, setStatus] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)
  const voices = useUsableVoices()
  const voiceName = (id: string | null) => [...(voices.data?.own ?? []), ...(voices.data?.others ?? [])].find((v) => v.id === id)?.name ?? ''

  // Keep an unsent draft in this browser only.
  useEffect(() => {
    let d: string | null = null
    try { d = localStorage.getItem(DRAFT_KEY) } catch { /* storage blocked */ }
    const id = requestAnimationFrame(() => { if (d) setText((cur) => cur || d!) })
    return () => cancelAnimationFrame(id)
  }, [])
  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, text) } catch { /* storage blocked */ } }, [text])

  const credits = ttsCredits(text)
  const over = text.length - TTS_MAX_CHARS
  const notEnough = !ctx.balance.unlimited && credits > ctx.balance.total

  const history = useInfiniteQuery({
    queryKey: ['history', 'tts'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api<{ items: Generation[]; nextBefore: string | null }>(`/api/v1/history?module=tts&limit=10${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ''}`),
    getNextPageParam: (last) => last.nextBefore,
  })

  // Each take runs as a job on the server, so it keeps going if you change page or close the tab.
  const job = useJob(async (j) => {
    if (j.status === 'succeeded' && j.output?.generationId) {
      setLatest(await api<Generation>(`/api/v1/history/${String(j.output.generationId)}`))
      setStatus(t.resultReady)
    } else setStatus('')
    void qc.invalidateQueries({ queryKey: ['history', 'tts'] })
    router.refresh()
  }, { resume: { types: ['tts'] } })
  const generate = useMutation({
    mutationFn: () => api<JobState>('/api/v1/text-to-speech/async', { method: 'POST', json: { text, voiceId, model, format, settings, pronunciation: usePron } }),
    onMutate: () => { setFields({}); setStatus(t.generatingStatus) },
    onSuccess: (j) => job.start(j),
    onError: (e) => {
      setStatus('')
      if (e instanceof ApiClientError && Object.keys(e.fields).length) {
        setFields(e.fields)
        if (e.fields.text) textRef.current?.focus()
      }
    },
  })
  const err = generate.error instanceof ApiClientError ? generate.error : null
  const del = useMutation({
    mutationFn: (id: string) => api(`/api/v1/history/${id}`, { method: 'DELETE' }),
    onSuccess: (_d, id) => { if (latest?.id === id) setLatest(null); setStatus(t.deleted); void qc.invalidateQueries({ queryKey: ['history', 'tts'] }) },
  })

  const items = useMemo(() => history.data?.pages.flatMap((p) => p.items) ?? [], [history.data])
  const busy = generate.isPending || job.active
  const disabled = !canGenerate || !text.trim() || over > 0 || !voiceId || notEnough || busy

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <header>
        <h1 className="app-page-title">{t.title}</h1>
        <p className="mt-1 text-[var(--text-muted)]">{t.subtitle}</p>
      </header>
      {!canGenerate ? <FormMessage tone="info">{c.viewerReadOnly}</FormMessage> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="tts-text" className="m-card grid content-start gap-3 p-4 sm:p-6">
          <label id="tts-text" htmlFor="tts-input" className="m-label">{t.textLabel}</label>
          <textarea id="tts-input" ref={textRef} className="m-textarea min-h-[280px] lg:min-h-[360px]" placeholder={t.placeholder} value={text}
            onChange={(e) => setText(e.target.value)} aria-invalid={fields.text || over > 0 ? true : undefined} aria-describedby="tts-count tts-err" />
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <span id="tts-count" className={over > 0 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'} aria-live="polite">
              {over > 0 ? fmt(t.overLimit, { count: formatNumber(over) }) : fmt(t.count, { count: formatNumber(text.length), max: formatNumber(TTS_MAX_CHARS) })}
            </span>
            <span className="text-[var(--text-muted)]">{text ? fmt(t.estimate, { credits: plural(credits, c.creditsOne, c.credits) }) : t.estimateFree}</span>
          </div>
          <p id="tts-err" className="m-error empty:hidden">{fields.text ?? ''}</p>
          {notEnough && text.trim() ? <OverQuota needed={credits} available={ctx.balance.total} /> : null}
          {err && err.code === 'insufficient_credits' ? <OverQuota needed={Number(err.extra.needed)} available={Number(err.extra.available)} /> : null}
          {err && err.code !== 'insufficient_credits' && !Object.keys(err.fields).length ? (
            <FormMessage>{err.message} <button type="button" className="link" onClick={() => generate.mutate()}>{c.retry}</button></FormMessage>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="m-btn primary lg" disabled={disabled} aria-busy={busy} onClick={() => generate.mutate()}>
              <Wand2 aria-hidden="true" />{busy ? t.generating : t.generate}
            </button>
          </div>
          <JobProgress job={job.job} onCancel={job.cancel} />
          <p className="sr-only" role="status" aria-live="polite">{status}</p>
          {busy ? <div className="m-skeleton h-11" aria-hidden="true" /> : latest ? (
            <div className="grid gap-2 border-t border-[var(--border)] pt-4">
              <h2 className="text-[15px] font-semibold">{t.resultTitle}</h2>
              <GenerationPlayer g={latest} title={`${voiceName(latest.voiceId)}: ${latest.text?.slice(0, 60) ?? ''}`} />
            </div>
          ) : null}
        </section>

        <aside aria-label={t.settings} className="m-card grid content-start gap-5 p-4 sm:p-6">
          <VoicePicker id="tts-voice" label={t.voice} value={voiceId} onChange={(id) => setVoiceId(id)} error={fields.voiceId} />
          {models.length > 1 ? (
            <div>
              <label htmlFor="tts-model" className="m-label">{t.model}</label>
              <select id="tts-model" className="m-select" value={model} onChange={(e) => setModel(e.target.value)}>
                {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          ) : null}
          <fieldset className="grid gap-4">
            <div className="flex items-center justify-between">
              <legend className="text-[15px] font-semibold">{t.settings}</legend>
              <button type="button" className="m-btn ghost sm" onClick={() => setSettings(DEFAULTS)}><RotateCcw aria-hidden="true" />{t.reset}</button>
            </div>
            <SliderField label={t.stability.label} hint={t.stability.hint} value={settings.stability} min={0} max={1} step={0.01} onChange={(v) => setSettings((s) => ({ ...s, stability: v }))} />
            <SliderField label={t.similarity.label} hint={t.similarity.hint} value={settings.similarity} min={0} max={1} step={0.01} onChange={(v) => setSettings((s) => ({ ...s, similarity: v }))} />
            <SliderField label={t.style.label} hint={t.style.hint} value={settings.style} min={0} max={1} step={0.01} onChange={(v) => setSettings((s) => ({ ...s, style: v }))} />
            <SliderField label={t.speed.label} hint={t.speed.hint} value={settings.speed} min={0.7} max={1.2} step={0.01} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => setSettings((s) => ({ ...s, speed: v }))} />
          </fieldset>
          <div>
            <span className="m-label" id="tts-format">{t.format}</span>
            <ToggleGroup.Root type="single" className="seg" aria-labelledby="tts-format" value={format} onValueChange={(v) => v && setFormat(v as 'mp3' | 'wav')}>
              <ToggleGroup.Item value="mp3" className="seg-item">{t.formats.mp3}</ToggleGroup.Item>
              <ToggleGroup.Item value="wav" className="seg-item">{t.formats.wav}</ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>
          <div className="grid gap-2">
            <label className="flex items-center gap-3 text-[14px]"><input type="checkbox" className="size-5 accent-[var(--primary)]" checked={usePron} onChange={(e) => setUsePron(e.target.checked)} />{t.pronunciation} <span className="text-[var(--text-subtle)]">({fmt(t.pronunciationCount, { count: ruleCount })})</span></label>
            <button type="button" className="m-btn secondary sm justify-self-start" onClick={() => setDictOpen(true)}><BookA aria-hidden="true" />{t.manageDictionary}</button>
          </div>
        </aside>
      </div>

      <section aria-labelledby="tts-history" className="grid gap-3">
        <h2 id="tts-history" className="text-[20px] font-semibold">{t.history}</h2>
        {history.isLoading ? <div className="grid gap-2" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="m-skeleton h-16" />)}</div>
          : history.isError ? <FormMessage>{c.networkError} <button type="button" className="link" onClick={() => history.refetch()}>{c.retry}</button></FormMessage>
          : items.length === 0 ? <p className="app-empty">{t.historyEmpty}</p>
          : (
            <ul className="grid gap-2">
              {items.map((g) => (
                <li key={g.id} className="m-card grid gap-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[14px]">{g.text}</p>
                      <p className="text-[12px] text-[var(--text-subtle)]">{fmt(t.historyItem, { voice: voiceName(g.voiceId) || '—', duration: formatTime((g.durationMs ?? 0) / 1000) })} · {new Date(g.createdAt).toLocaleString()} · {plural(g.credits, c.creditsOne, c.credits)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" className="m-btn ghost sm" onClick={() => { setText(g.text ?? ''); if (g.voiceId) setVoiceId(g.voiceId); if (g.settings) setSettings(g.settings); textRef.current?.focus() }}>{c.reuse}</button>
                      <ConfirmButton className="m-btn ghost icon sm" ariaLabel={t.deleteTake} title={t.deleteTake} onConfirm={() => del.mutateAsync(g.id).then(() => undefined)}><Trash2 aria-hidden="true" /></ConfirmButton>
                    </div>
                  </div>
                  <GenerationPlayer g={g} title={`${voiceName(g.voiceId)}: ${g.text?.slice(0, 60) ?? ''}`} />
                </li>
              ))}
            </ul>
          )}
        {history.hasNextPage ? <button type="button" className="m-btn secondary justify-self-center" disabled={history.isFetchingNextPage} onClick={() => history.fetchNextPage()}>{c.loadMore}</button> : null}
      </section>
      <PronunciationDialog open={dictOpen} onOpenChange={setDictOpen} onCount={setRuleCount} />
    </div>
  )
}
