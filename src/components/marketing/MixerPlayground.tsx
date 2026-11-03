'use client'
import { Slider, ToggleGroup } from 'radix-ui'
import { CircleAlert, Play, Square } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { BlobPlayer } from '@/lib/blob-player'
import { Spinner } from '@/components/ui/Spinner'
import { AdjustSlider, barycentric, fill, fromWeights, percentages, TrianglePad, type Point } from '@/components/mixer/MixerControls'

export { barycentric, percentages }

export interface MixerLabels {
  twoVoices: string; threeVoices: string; modeLabel: string; sourceLabel: string; sliderLabel: string; padLabel: string; padHelp: string
  padValue: string; weightsTitle: string; adjustTitle: string; pitch: string; pace: string; warmth: string
  lower: string; higher: string; slower: string; faster: string; brighter: string; warmer: string
  sentence: string; sentenceLabel: string; preview: string; previewing: string; stop: string; error: string; duplicate: string
  valueText: string
}
interface MixVoice { id: string; name: string }

export function MixerPlayground({ voices, labels, compact = false, defaults = ['wren', 'atlas', 'juniper'] }: { voices: MixVoice[]; labels: MixerLabels; compact?: boolean; defaults?: string[] }) {
  const id = useId()
  const [mode, setMode] = useState<'2' | '3'>('2')
  const [sources, setSources] = useState<string[]>(defaults)
  const [blend, setBlend] = useState(50)
  const [point, setPoint] = useState<Point>(fromWeights([1 / 3, 1 / 3, 1 / 3]))
  const [adjust, setAdjust] = useState({ pitch: 0, pace: 0, warmth: 0 })
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [player] = useState(() => new BlobPlayer(() => setStatus('idle')))
  useEffect(() => () => player.dispose(), [player])

  const active = mode === '2' ? sources.slice(0, 2) : sources.slice(0, 3)
  const names = active.map((sid) => voices.find((v) => v.id === sid)?.name ?? sid)
  const weights = useMemo(() => (mode === '2' ? [1 - blend / 100, blend / 100] : barycentric(point)), [mode, blend, point])
  const pct = percentages(weights)
  const duplicate = new Set(active).size !== active.length

  const preview = async () => {
    if (status === 'playing') { player.stop(); return }
    if (duplicate) { setStatus('error'); setMessage(labels.duplicate); return }
    setStatus('loading'); setMessage('')
    try {
      const res = await fetch('/api/demo/mix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sources: active.map((voiceId, i) => ({ voiceId, weight: Math.max(0.001, weights[i] ?? 0) })), adjust }) })
      if (!res.ok) { setStatus('error'); setMessage(labels.error); return }
      await player.play(await res.blob())
      setStatus('playing')
    } catch { setStatus('error'); setMessage(labels.error) }
  }

  return (
    <div className="m-card p-5 sm:p-8">
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ToggleGroup.Root type="single" value={mode} onValueChange={(v) => v && setMode(v as '2' | '3')} aria-label={labels.modeLabel} className="seg">
            <ToggleGroup.Item value="2" className="seg-item">{labels.twoVoices}</ToggleGroup.Item>
            <ToggleGroup.Item value="3" className="seg-item">{labels.threeVoices}</ToggleGroup.Item>
          </ToggleGroup.Root>
        </div>
      )}
      {!compact && (
        <div className={`mt-6 grid gap-4 ${mode === '3' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {active.map((sid, i) => (
            <div key={i}>
              <label htmlFor={`${id}-src${i}`} className="m-label">{fill(labels.sourceLabel, { n: i + 1 })}</label>
              <select id={`${id}-src${i}`} className="m-select" value={sid} onChange={(e) => { const next = [...sources]; next[i] = e.target.value; setSources(next); setStatus('idle') }} aria-invalid={duplicate && active.indexOf(sid) !== i ? true : undefined}>
                {voices.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
      <div className="mt-8">
        {mode === '2' ? (
          <div>
            <div className="mb-2 flex justify-between text-sm font-semibold"><span>{names[0]}</span><span>{names[1]}</span></div>
            <Slider.Root className="m-slider blend" min={0} max={100} step={1} value={[blend]} onValueChange={(v) => setBlend(v[0] ?? 50)}>
              <Slider.Track className="m-slider-track"><Slider.Range className="m-slider-range" /></Slider.Track>
              <Slider.Thumb className="m-slider-thumb" aria-label={fill(labels.sliderLabel, { a: names[0] ?? '', b: names[1] ?? '' })} aria-valuetext={fill(labels.valueText, { left: names[0] ?? '', leftPct: pct[0] ?? 0, right: names[1] ?? '', rightPct: pct[1] ?? 0 })} />
            </Slider.Root>
          </div>
        ) : (
          <TrianglePad point={point} onChange={setPoint} names={names} labels={labels} />
        )}
      </div>
      <div className="mt-6" aria-live="off">
        <p className="eyebrow text-text-muted">{labels.weightsTitle}</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {names.map((n, i) => <li key={n + i} className="m-badge">{n} {pct[i]}%</li>)}
        </ul>
      </div>
      {!compact && (
        <fieldset className="mt-8">
          <legend className="font-display text-lg font-semibold">{labels.adjustTitle}</legend>
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            <AdjustSlider label={labels.pitch} low={labels.lower} high={labels.higher} value={adjust.pitch} onChange={(v) => setAdjust({ ...adjust, pitch: v })} />
            <AdjustSlider label={labels.pace} low={labels.slower} high={labels.faster} value={adjust.pace} onChange={(v) => setAdjust({ ...adjust, pace: v })} />
            <AdjustSlider label={labels.warmth} low={labels.brighter} high={labels.warmer} value={adjust.warmth} onChange={(v) => setAdjust({ ...adjust, warmth: v })} />
          </div>
        </fieldset>
      )}
      <div className="mt-8 rounded-[10px] border border-border bg-surface-2 p-4">
        <p className="text-xs font-semibold text-text-subtle">{labels.sentenceLabel}</p>
        <p className="mt-1 text-text">“{labels.sentence}”</p>
      </div>
      <button type="button" onClick={preview} className="m-btn primary lg mt-4 w-full sm:w-auto" aria-busy={status === 'loading'} disabled={status === 'loading'}>
        {status === 'loading' ? <><Spinner label={labels.previewing} /><span aria-hidden="true">{labels.previewing}</span></>
          : status === 'playing' ? <><Square strokeWidth={1.75} aria-hidden="true" fill="currentColor" />{labels.stop}</>
          : <><Play strokeWidth={1.75} aria-hidden="true" fill="currentColor" />{labels.preview}</>}
      </button>
      <div role="status" aria-live="polite">{status === 'error' && <p className="m-error"><CircleAlert strokeWidth={1.75} aria-hidden="true" />{message}</p>}</div>
    </div>
  )
}
