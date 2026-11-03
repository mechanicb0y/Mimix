'use client'
import { Slider } from 'radix-ui'
import { AlertCircle } from 'lucide-react'
import { useId } from 'react'

/** Labelled slider with its value shown and a hint, for voice settings. */
export function SliderField({ label, hint, value, min, max, step, onChange, format = (v) => `${Math.round(v * 100)}%`, disabled, error }: {
  label: string; hint?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string; disabled?: boolean; error?: string
}) {
  const id = useId()
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span id={`${id}-l`} className="m-label mb-0">{label}</span>
        <span className="font-mono text-[13px] text-[var(--text-muted)]" aria-hidden="true">{format(value)}</span>
      </div>
      <Slider.Root className="m-slider" value={[value]} min={min} max={max} step={step} disabled={disabled} onValueChange={([v]) => onChange(v ?? value)}>
        <Slider.Track className="m-slider-track"><Slider.Range className="m-slider-range" /></Slider.Track>
        <Slider.Thumb className="m-slider-thumb" aria-labelledby={`${id}-l`} aria-describedby={[hint ? `${id}-h` : '', error ? `${id}-e` : ''].filter(Boolean).join(' ') || undefined} aria-invalid={error ? true : undefined} aria-valuetext={format(value)} />
      </Slider.Root>
      {hint ? <p id={`${id}-h`} className="m-hint mt-1">{hint}</p> : null}
      {error ? <p id={`${id}-e`} className="m-error mt-1"><AlertCircle size={16} aria-hidden="true" className="mt-px flex-none" />{error}</p> : null}
    </div>
  )
}
