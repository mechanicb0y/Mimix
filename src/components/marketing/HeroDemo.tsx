'use client'
import { CircleAlert, Play, Square } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { BlobPlayer } from '@/lib/blob-player'
import { Spinner } from '@/components/ui/Spinner'

export interface HeroDemoLabels {
  title: string; textLabel: string; defaultText: string; voiceLabel: string; generate: string; generating: string; stop: string
  charCount: string; overLimit: string; empty: string; error: string; rateLimited: string; ready: string
}
interface DemoVoice { id: string; name: string; traits: string }
type Status = 'idle' | 'loading' | 'playing' | 'error'

const fill = (t: string, v: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m))

/** Live hero demo: type, pick a voice, press play. Uses /api/demo/tts (mock engine in development). */
export function HeroDemo({ labels, voices, maxChars, engineNote }: { labels: HeroDemoLabels; voices: DemoVoice[]; maxChars: number; engineNote?: string }) {
  const id = useId()
  const [text, setText] = useState(labels.defaultText)
  const [voiceId, setVoiceId] = useState(voices[0]?.id ?? '')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [player] = useState(() => new BlobPlayer(() => setStatus('idle')))
  useEffect(() => () => player.dispose(), [player])

  const count = text.length
  const over = count > maxChars
  const empty = text.trim().length === 0
  const fieldError = over ? fill(labels.overLimit, { max: maxChars }) : null

  async function play() {
    if (status === 'playing') { player.stop(); return }
    if (empty) { setStatus('error'); setMessage(labels.empty); return }
    if (over) return
    setStatus('loading'); setMessage('')
    try {
      const res = await fetch('/api/demo/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voiceId }) })
      if (!res.ok) { setStatus('error'); setMessage(res.status === 429 ? labels.rateLimited : labels.error); return }
      await player.play(await res.blob())
      setStatus('playing'); setMessage(labels.ready)
    } catch {
      setStatus('error'); setMessage(labels.error)
    }
  }

  return (
    <div className="m-card brand-glow p-5 sm:p-6" aria-labelledby={`${id}-title`} role="region">
      <h2 id={`${id}-title`} className="font-display text-lg font-semibold">{labels.title}</h2>
      <div className="mt-4">
        <label htmlFor={`${id}-text`} className="m-label">{labels.textLabel}</label>
        <textarea
          id={`${id}-text`} className="m-textarea min-h-[112px]" value={text} rows={4}
          onChange={(e) => { setText(e.target.value); if (status === 'error') setStatus('idle') }}
          aria-invalid={over ? true : undefined} aria-describedby={`${id}-count${fieldError ? ` ${id}-err` : ''}`}
        />
        <div className="mt-1 flex justify-between gap-3">
          <span>{fieldError && <span id={`${id}-err`} className="m-error mt-0"><CircleAlert strokeWidth={1.75} aria-hidden="true" />{fieldError}</span>}</span>
          <span id={`${id}-count`} className={`flex-none text-xs ${over ? 'text-danger' : 'text-text-subtle'}`}>{fill(labels.charCount, { count, max: maxChars })}</span>
        </div>
      </div>
      <fieldset className="mt-4">
        <legend className="m-label">{labels.voiceLabel}</legend>
        <div className="grid grid-cols-2 gap-2">
          {voices.map((v) => (
            <label key={v.id} className="group relative flex min-h-[52px] cursor-pointer flex-col justify-center rounded-[10px] border border-border-strong bg-surface-2 px-3 py-2 transition-colors hover:border-text-muted has-[:checked]:border-primary has-[:checked]:bg-surface-3 has-[:focus-visible]:shadow-[var(--focus-ring)]">
              <input type="radio" name={`${id}-voice`} value={v.id} checked={voiceId === v.id} onChange={() => setVoiceId(v.id)} className="sr-only" />
              <span className="text-sm font-semibold">{v.name}</span>
              <span className="text-xs text-text-muted">{v.traits}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="button" onClick={play} className="m-btn primary lg mt-5 w-full" aria-busy={status === 'loading'} disabled={status === 'loading' || over}>
        {status === 'loading' ? <><Spinner label={labels.generating} /><span aria-hidden="true">{labels.generating}</span></>
          : status === 'playing' ? <><Square strokeWidth={1.75} aria-hidden="true" fill="currentColor" />{labels.stop}</>
          : <><Play strokeWidth={1.75} aria-hidden="true" fill="currentColor" />{labels.generate}</>}
      </button>
      <div role="status" aria-live="polite" className="min-h-[20px]">
        {status === 'error' && <p className="m-error"><CircleAlert strokeWidth={1.75} aria-hidden="true" />{message}</p>}
        {status === 'playing' && <p className="sr-only">{message}</p>}
      </div>
      {engineNote && <p className="mt-2 text-xs leading-[18px] text-text-subtle">{engineNote}</p>}
    </div>
  )
}
