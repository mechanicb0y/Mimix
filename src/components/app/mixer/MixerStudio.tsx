'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Slider, ToggleGroup } from 'radix-ui'
import { Blend, CheckCircle2, Lock, Play, Save, Square } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { BlobPlayer } from '@/lib/blob-player'
import { getMessages, fmt, formatNumber, plural } from '@/i18n'
import { CREDIT_RATES } from '@/config/plans'
import { LICENCES } from '@/lib/schemas/voices'
import { AdjustSlider, barycentric, fill, fromWeights, percentages, TrianglePad, type Point } from '@/components/mixer/MixerControls'
import { FormMessage, TextArea, TextInput } from '@/components/app/Field'
import { OverQuota } from '@/components/app/OverQuota'
import { PreviewButton, useUsableVoices, type VoiceOption } from '@/components/app/VoicePicker'
import { useAppContext } from '@/components/app/shell/context'
import { Spinner } from '@/components/ui/Spinner'

type Licence = (typeof LICENCES)[number]
const STRICTNESS: Record<Licence, number> = { remix: 0, standard: 1, private: 2 }
const mixable = (v: VoiceOption) => v.mixable !== false && (v.owned || v.licence === 'remix')

/** Whole percentages that add up to 100, with every source at 1% or more (the API refuses 0%). */
export function sourcePercentages(weights: number[]): number[] {
  const pct = percentages(weights)
  for (let i = 0; i < pct.length; i++) {
    while ((pct[i] ?? 0) < 1) {
      const top = pct.indexOf(Math.max(...pct))
      pct[top] = (pct[top] ?? 0) - 1
      pct[i] = (pct[i] ?? 0) + 1
    }
  }
  return pct
}

interface SavedVoice { id: string; name: string; licence: Licence; promoteStatus?: string | null }

export function MixerStudio({ canGenerate, libraryOnly = false }: { canGenerate: boolean; libraryOnly?: boolean }) {
  const t = getMessages().app.mixer
  const pg = getMessages().mixer.playground
  const c = getMessages().app.common
  const ctx = useAppContext()
  const qc = useQueryClient()
  const router = useRouter()
  const id = useId()
  const maxSources = ctx.plan.mixerSources
  const voices = useUsableVoices(mixable)
  const all = useMemo(() => [...(voices.data?.own ?? []), ...(voices.data?.others ?? [])], [voices.data])

  const [mode, setMode] = useState<'2' | '3'>('2')
  const [picked, setPicked] = useState<string[]>([])
  const [blend, setBlend] = useState(50)
  const [point, setPoint] = useState<Point>(fromWeights([1 / 3, 1 / 3, 1 / 3]))
  const [adjust, setAdjust] = useState({ pitch: 0, pace: 0, warmth: 0 })
  const [play, setPlay] = useState<'idle' | 'loading' | 'playing'>('idle')
  const [previewErr, setPreviewErr] = useState<ApiClientError | null>(null)
  const [player] = useState(() => new BlobPlayer(() => setPlay('idle')))
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [licence, setLicence] = useState<Licence | null>(null)
  const [saved, setSaved] = useState<SavedVoice | null>(null)
  const [status, setStatus] = useState('')
  useEffect(() => () => player.dispose(), [player])

  // Default sources: the first mixable voices, in list order, once the list arrives.
  const defaults = all.slice(0, 3).map((v) => v.id)
  const sources = [0, 1, 2].map((i) => picked[i] ?? defaults[i] ?? '')
  const count = mode === '2' ? 2 : 3
  const active = sources.slice(0, count)
  const chosen = active.map((sid) => all.find((v) => v.id === sid))
  const names = chosen.map((v) => v?.name ?? '')
  const weights = mode === '2' ? [1 - blend / 100, blend / 100] : barycentric(point)
  const pct = sourcePercentages(weights)
  const duplicate = new Set(active).size !== active.length
  const floor: Licence = chosen.reduce<Licence>((a, v) => (v && STRICTNESS[v.licence as Licence] > STRICTNESS[a] ? (v.licence as Licence) : a), 'remix')
  const effectiveLicence: Licence = licence && STRICTNESS[licence] >= STRICTNESS[floor] ? licence : floor
  const payload = { sources: active.map((voiceId, i) => ({ voiceId, weight: (pct[i] ?? 0) / 100 })), adjust }
  const cost = CREDIT_RATES.mixerSave
  const notEnough = !ctx.balance.unlimited && cost > ctx.balance.total

  const choose = (i: number, value: string) => {
    const next = [...sources]; next[i] = value
    setPicked(next); setSaved(null); player.stop()
  }

  const preview = async () => {
    if (play === 'playing') { player.stop(); return }
    setPlay('loading'); setPreviewErr(null); setStatus('')
    try {
      const res = await fetch('/api/v1/voices/mix/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const e = (await res.json().catch(() => null))?.error ?? {}
        throw new ApiClientError(res.status, e.code ?? 'error', e.message ?? t.previewError, e.fields ?? {})
      }
      await player.play(await res.blob())
      setPlay('playing'); setStatus(t.previewPlaying)
    } catch (e) {
      setPlay('idle')
      setPreviewErr(e instanceof ApiClientError ? e : new ApiClientError(0, 'error', t.previewError))
    }
  }

  const save = useMutation({
    mutationFn: () => api<SavedVoice>('/api/v1/voices/mix', { method: 'POST', json: { ...payload, name, description, licence: effectiveLicence } }),
    onMutate: () => setStatus(''),
    onSuccess: (v) => {
      setSaved(v); setName(''); setDescription('')
      setStatus([fmt(t.saved, { name: v.name }), v.promoteStatus === 'pending' ? fmt(t.upgradeNote, { name: v.name }) : ''].filter(Boolean).join(' '))
      void qc.invalidateQueries({ queryKey: ['voices'] })
      router.refresh() // updates the credits meter
    },
  })
  const saveErr = save.error instanceof ApiClientError ? save.error : null
  const fieldErr = { ...(previewErr?.fields ?? {}), ...(saveErr?.fields ?? {}) }
  const sourceErr = (i: number) => fieldErr[`sources.${i}.voiceId`] ?? (duplicate && active.indexOf(active[i]!) !== i ? getMessages().app.validation.sourcesDistinct : undefined)
  const busy = play === 'loading' || save.isPending

  if (voices.isLoading) {
    return (
      <Shell>
        <div className="grid gap-4" aria-hidden="true"><div className="m-skeleton h-40" /><div className="m-skeleton h-64" /></div>
        <p className="sr-only" role="status">{c.loading}</p>
      </Shell>
    )
  }
  if (voices.isError) {
    return <Shell><FormMessage>{t.loadError} <button type="button" className="link" onClick={() => voices.refetch()}>{c.retry}</button></FormMessage></Shell>
  }
  if (all.length < 2) {
    return (
      <Shell>
        <div className="m-card grid justify-items-start gap-3 p-6">
          <Blend aria-hidden="true" className="text-[var(--primary)]" />
          <h2 className="text-[20px] font-semibold">{t.emptyTitle}</h2>
          <p className="text-[var(--text-muted)]">{libraryOnly ? `${t.libraryOnlyHint} ${t.libraryOnlyNote}` : t.emptyBody}</p>
          <Link href="/app/voices/library" className="m-btn primary">{t.browseLibrary}</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {!canGenerate ? <FormMessage tone="info">{c.viewerReadOnly}</FormMessage> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start gap-6">
          <section aria-labelledby={`${id}-src`} className="m-card grid content-start gap-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id={`${id}-src`} className="text-[18px] font-semibold">{t.sourcesTitle}</h2>
              <ToggleGroup.Root type="single" value={mode} onValueChange={(v) => { if (v) { setMode(v as '2' | '3'); player.stop() } }} aria-label={pg.modeLabel} className="seg">
                <ToggleGroup.Item value="2" className="seg-item">{pg.twoVoices}</ToggleGroup.Item>
                <ToggleGroup.Item value="3" className="seg-item inline-flex items-center gap-1 whitespace-nowrap" disabled={maxSources < 3} aria-describedby={maxSources < 3 ? `${id}-locked` : undefined}>
                  {maxSources < 3 ? <Lock aria-hidden="true" size={14} /> : null}{pg.threeVoices}
                </ToggleGroup.Item>
              </ToggleGroup.Root>
            </div>
            {maxSources < 3 ? (
              <p id={`${id}-locked`} className="m-hint">{t.threeLocked} {ctx.workspace.role === 'owner' ? <Link href="/app/settings/billing" className="link">{t.seePlans}</Link> : null}</p>
            ) : null}
            <div className={`grid gap-4 ${count === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              {active.map((sid, i) => {
                const err = sourceErr(i)
                const v = chosen[i]
                return (
                  <div key={i}>
                    <label htmlFor={`${id}-s${i}`} className="m-label">{fill(pg.sourceLabel, { n: i + 1 })}</label>
                    <div className="flex items-center gap-1">
                      <select id={`${id}-s${i}`} className="m-select min-w-0 flex-1" value={sid} onChange={(e) => choose(i, e.target.value)}
                        aria-invalid={err ? true : undefined} aria-describedby={err ? `${id}-s${i}-err` : `${id}-hint`}>
                        {voices.data!.own.length ? <optgroup label={getMessages().app.voicePicker.yours}>{voices.data!.own.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</optgroup> : null}
                        <optgroup label={getMessages().app.voicePicker.others}>{voices.data!.others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</optgroup>
                      </select>
                      {v ? <PreviewButton voice={v} /> : null}
                    </div>
                    {err ? <p id={`${id}-s${i}-err`} className="m-error">{err}</p> : null}
                  </div>
                )
              })}
            </div>
            <p id={`${id}-hint`} className="m-hint">{libraryOnly ? t.libraryOnlyHint : t.sourcesHint}</p>
            {libraryOnly ? <p className="m-hint">{t.libraryOnlyNote}</p> : null}
          </section>

          <section aria-labelledby={`${id}-blend`} className="m-card grid content-start gap-6 p-4 sm:p-6">
            <h2 id={`${id}-blend`} className="text-[18px] font-semibold">{t.blendTitle}</h2>
            {mode === '2' ? (
              <div>
                <div className="mb-2 flex justify-between text-[14px] font-semibold"><span>{names[0]}</span><span>{names[1]}</span></div>
                <Slider.Root className="m-slider blend" min={1} max={99} step={1} value={[blend]} onValueChange={(v) => setBlend(v[0] ?? 50)}>
                  <Slider.Track className="m-slider-track"><Slider.Range className="m-slider-range" /></Slider.Track>
                  <Slider.Thumb className="m-slider-thumb" aria-label={fill(pg.sliderLabel, { a: names[0] ?? '', b: names[1] ?? '' })}
                    aria-valuetext={fill(t.valueText, { left: names[0] ?? '', leftPct: pct[0] ?? 0, right: names[1] ?? '', rightPct: pct[1] ?? 0 })} />
                </Slider.Root>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-[420px]"><TrianglePad point={point} onChange={setPoint} names={names} labels={pg} /></div>
            )}
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-muted)]">{pg.weightsTitle}</p>
              <ul className="mt-2 flex flex-wrap gap-2">{names.map((n, i) => <li key={i} className="m-badge">{n} {pct[i]}%</li>)}</ul>
            </div>
            <fieldset>
              <legend className="text-[15px] font-semibold">{pg.adjustTitle}</legend>
              <div className="mt-4 grid gap-6 sm:grid-cols-3">
                <AdjustSlider label={pg.pitch} low={pg.lower} high={pg.higher} value={adjust.pitch} onChange={(v) => setAdjust((a) => ({ ...a, pitch: v }))} />
                <AdjustSlider label={pg.pace} low={pg.slower} high={pg.faster} value={adjust.pace} onChange={(v) => setAdjust((a) => ({ ...a, pace: v }))} />
                <AdjustSlider label={pg.warmth} low={pg.brighter} high={pg.warmer} value={adjust.warmth} onChange={(v) => setAdjust((a) => ({ ...a, warmth: v }))} />
              </div>
            </fieldset>
            <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <p className="text-[12px] font-semibold text-[var(--text-subtle)]">{pg.sentenceLabel}</p>
              <p className="mt-1">“{pg.sentence}”</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="m-btn primary lg" onClick={preview} disabled={!canGenerate || duplicate || busy} aria-busy={play === 'loading'}>
                {play === 'loading' ? <><Spinner label={pg.previewing} /><span aria-hidden="true">{pg.previewing}</span></>
                  : play === 'playing' ? <><Square aria-hidden="true" fill="currentColor" />{c.stop}</>
                  : <><Play aria-hidden="true" fill="currentColor" />{pg.preview}</>}
              </button>
              <span className="text-[13px] text-[var(--text-muted)]">{c.free}</span>
            </div>
            {previewErr && !Object.keys(previewErr.fields).length ? (
              <FormMessage>{previewErr.message} <button type="button" className="link" onClick={preview}>{c.retry}</button></FormMessage>
            ) : null}
          </section>
        </div>

        <aside aria-labelledby={`${id}-save`} className="m-card grid content-start gap-4 p-4 sm:p-6">
          <h2 id={`${id}-save`} className="text-[18px] font-semibold">{t.saveTitle}</h2>
          <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
            <TextInput label={t.name} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required error={fieldErr.name} autoComplete="off" />
            <TextArea label={<>{t.description} <span className="font-normal text-[var(--text-subtle)]">({c.optional})</span></>} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} error={fieldErr.description} />
            <fieldset aria-describedby={`${id}-floor`}>
              <legend className="m-label">{t.licence}</legend>
              <div className="grid gap-2">
                {LICENCES.map((l) => {
                  const allowed = STRICTNESS[l] >= STRICTNESS[floor]
                  return (
                    <label key={l} className={`flex items-start gap-3 rounded-[10px] border border-[var(--border)] p-3 ${allowed ? 'cursor-pointer' : 'opacity-60'}`}>
                      <input type="radio" name={`${id}-licence`} className="mt-1 size-4 accent-[var(--primary)]" checked={effectiveLicence === l} disabled={!allowed} onChange={() => setLicence(l)} />
                      <span><span className="block text-[14px] font-semibold">{t.licences[l]}</span><span className="block text-[13px] text-[var(--text-muted)]">{t.licenceHelp[l]}</span></span>
                    </label>
                  )
                })}
              </div>
              <p id={`${id}-floor`} className="m-hint">{fmt(t.licenceFloor, { floor: t.licences[floor] })}</p>
              {fieldErr.licence ? <p className="m-error">{fieldErr.licence}</p> : null}
            </fieldset>
            <p className="text-[13px] text-[var(--text-muted)]">
              {ctx.balance.unlimited ? fmt(t.saveCostUnlimited, { credits: plural(cost, c.creditsOne, c.credits) })
                : fmt(t.saveCost, { credits: plural(cost, c.creditsOne, c.credits), available: formatNumber(ctx.balance.total) })}
            </p>
            {notEnough ? <OverQuota needed={cost} available={ctx.balance.total} /> : null}
            {saveErr?.code === 'insufficient_credits' ? <OverQuota needed={Number(saveErr.extra.needed)} available={Number(saveErr.extra.available)} /> : null}
            {saveErr && saveErr.code !== 'insufficient_credits' && !Object.keys(saveErr.fields).length ? <FormMessage>{saveErr.message}</FormMessage> : null}
            {saveErr?.fields.sources ? <FormMessage>{saveErr.fields.sources}</FormMessage> : null}
            <button type="submit" className="m-btn primary" disabled={!canGenerate || !name.trim() || duplicate || notEnough || busy} aria-busy={save.isPending}>
              <Save aria-hidden="true" />{save.isPending ? t.saving : t.save}
            </button>
            <p className="m-hint">{t.lineageNote}</p>
          </form>
          {saved ? (
            <div className="grid gap-3 border-t border-[var(--border)] pt-4">
              <p className="flex items-start gap-2 font-semibold"><CheckCircle2 aria-hidden="true" className="mt-0.5 flex-none text-[var(--success)]" size={18} />{fmt(t.saved, { name: saved.name })}</p>
              {saved.promoteStatus === 'pending' ? <p className="m-hint">{fmt(t.upgradeNote, { name: saved.name })}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Link href={`/app/speech?voice=${encodeURIComponent(saved.id)}`} className="m-btn secondary sm">{t.useInSpeech}</Link>
                <Link href={`/app/voices/${encodeURIComponent(saved.id)}`} className="m-btn ghost sm">{t.openVoice}</Link>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  const t = getMessages().app.mixer
  const c = getMessages().app.common
  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <header>
        <h1 className="app-page-title">{t.title}</h1>
        <p className="mt-1 text-[var(--text-muted)]">{fmt(t.subtitle, { credits: plural(CREDIT_RATES.mixerSave, c.creditsOne, c.credits) })}</p>
      </header>
      {children}
    </div>
  )
}
