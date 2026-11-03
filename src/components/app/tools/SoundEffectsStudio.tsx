'use client'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { ToggleGroup } from 'radix-ui'
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages, fmt, formatNumber, plural } from '@/i18n'
import { CREDIT_RATES } from '@/config/plans'
import { SFX_MAX_SECONDS, SFX_MIN_SECONDS, SFX_PROMPT_MAX } from '@/lib/schemas/audio-tools'
import { FormMessage, TextArea } from '@/components/app/Field'
import { SliderField } from '@/components/app/SliderField'
import { OverQuota } from '@/components/app/OverQuota'
import { GenerationPlayer } from '@/components/app/GenerationPlayer'
import { useAppContext } from '@/components/app/shell/context'
import { GenerationHistory, type HistoryGen } from './GenerationHistory'

export function SoundEffectsStudio({ canGenerate }: { canGenerate: boolean }) {
  const t = getMessages().app.sfx
  const c = getMessages().app.common
  const ctx = useAppContext()
  const qc = useQueryClient()
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [auto, setAuto] = useState(true)
  const [seconds, setSeconds] = useState(5)
  const [influence, setInfluence] = useState(0.3)
  const [format, setFormat] = useState<'mp3' | 'wav'>('mp3')
  const [latest, setLatest] = useState<HistoryGen & { text?: string | null } | null>(null)
  const cost = CREDIT_RATES.soundEffectPerGeneration
  const notEnough = !ctx.balance.unlimited && cost > ctx.balance.total
  const gen = useMutation({
    mutationFn: () => api<HistoryGen & { text: string | null }>('/api/v1/sound-effects', { method: 'POST', json: { prompt, seconds: auto ? undefined : seconds, promptInfluence: influence, format } }),
    onSuccess: (g) => { setLatest(g); void qc.invalidateQueries({ queryKey: ['history', 'sfx'] }); router.refresh() },
  })
  const err = gen.error instanceof ApiClientError ? gen.error : null
  return (
    <div className="mx-auto grid max-w-[1100px] gap-6">
      <header>
        <h1 className="app-page-title">{t.title}</h1>
        <p className="mt-1 text-[var(--text-muted)]">{fmt(t.subtitle, { credits: plural(cost, c.creditsOne, c.credits) })}</p>
      </header>
      {!canGenerate ? <FormMessage tone="info">{c.viewerReadOnly}</FormMessage> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form className="m-card grid content-start gap-4 p-4 sm:p-6" noValidate onSubmit={(e) => { e.preventDefault(); gen.mutate() }}>
          <TextArea label={t.prompt} hint={t.promptHint} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} maxLength={SFX_PROMPT_MAX} error={err?.fields.prompt} />
          <p className="-mt-2 text-[13px] text-[var(--text-muted)]">{fmt(t.count, { count: formatNumber(prompt.length), max: SFX_PROMPT_MAX })}</p>
          {notEnough ? <OverQuota needed={cost} available={ctx.balance.total} /> : null}
          {err?.code === 'insufficient_credits' ? <OverQuota needed={Number(err.extra.needed)} available={Number(err.extra.available)} /> : null}
          {err && err.code !== 'insufficient_credits' && !Object.keys(err.fields).length ? <FormMessage>{err.message}</FormMessage> : null}
          <button type="submit" className="m-btn primary lg justify-self-start" disabled={!canGenerate || !prompt.trim() || notEnough || gen.isPending} aria-busy={gen.isPending}>
            <Sparkles aria-hidden="true" />{gen.isPending ? t.generating : t.generate}
          </button>
          <p className="sr-only" role="status" aria-live="polite">{gen.isPending ? t.generating : latest ? t.ready : ''}</p>
          {gen.isPending ? <div className="m-skeleton h-11" aria-hidden="true" /> : latest ? (
            <div className="grid gap-2 border-t border-[var(--border)] pt-4">
              <h2 className="text-[15px] font-semibold">{t.latest}</h2>
              <GenerationPlayer g={latest} title={latest.text ?? t.latest} />
            </div>
          ) : null}
        </form>
        <aside className="m-card grid content-start gap-5 p-4 sm:p-6" aria-label={t.length}>
          <fieldset className="grid gap-3">
            <legend className="m-label">{t.length}</legend>
            <label className="flex items-center gap-3 text-[14px]"><input type="checkbox" className="size-5 accent-[var(--primary)]" checked={auto} onChange={(e) => setAuto(e.target.checked)} />{t.auto}</label>
            {!auto ? <SliderField label={t.lengthSeconds} value={seconds} min={SFX_MIN_SECONDS} max={SFX_MAX_SECONDS} step={0.5} format={(v) => fmt(t.seconds, { n: v })} onChange={setSeconds} error={err?.fields.seconds} /> : null}
          </fieldset>
          <SliderField label={t.influence} hint={t.influenceHint} value={influence} min={0} max={1} step={0.05} onChange={setInfluence} />
          <div>
            <span className="m-label" id="sfx-format">{getMessages().app.changer.format}</span>
            <ToggleGroup.Root type="single" className="seg" aria-labelledby="sfx-format" value={format} onValueChange={(v) => v && setFormat(v as 'mp3' | 'wav')}>
              <ToggleGroup.Item value="mp3" className="seg-item">MP3</ToggleGroup.Item>
              <ToggleGroup.Item value="wav" className="seg-item">WAV</ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>
        </aside>
      </div>
      <GenerationHistory module="sfx" title={t.history} empty={t.historyEmpty} label={(g) => (g as HistoryGen & { text?: string }).text ?? ''} />
    </div>
  )
}
