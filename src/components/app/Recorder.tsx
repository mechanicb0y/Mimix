'use client'
import { Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getMessages, fmt } from '@/i18n'
import { formatTime } from '@/components/ui/AudioPlayer'

/**
 * Records from the microphone with MediaRecorder. The result is a WebM/Opus (or MP4 on Safari) blob
 * that the server converts with ffmpeg. Stops on its own at maxSeconds.
 */
export function Recorder({ onRecorded, maxSeconds = 120, label, disabled }: { onRecorded: (blob: Blob, ms: number) => void; maxSeconds?: number; label: string; disabled?: boolean }) {
  const t = getMessages().app.recorder
  const [state, setState] = useState<'idle' | 'starting' | 'recording'>('idle')
  const [ms, setMs] = useState(0)
  const [error, setError] = useState('')
  const rec = useRef<MediaRecorder | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const started = useRef(0)

  const cleanup = () => {
    if (timer.current) clearInterval(timer.current)
    rec.current?.stream.getTracks().forEach((tr) => tr.stop())
    rec.current = null
  }
  useEffect(() => () => cleanup(), [])

  const start = async () => {
    setError('')
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) { setError(t.unsupported); return }
    setState('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } })
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m))
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
      const chunks: Blob[] = []
      r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      r.onstop = () => {
        const length = Date.now() - started.current
        cleanup(); setState('idle')
        onRecorded(new Blob(chunks, { type: r.mimeType || 'audio/webm' }), length)
      }
      rec.current = r
      started.current = Date.now()
      r.start(250)
      setMs(0); setState('recording')
      timer.current = setInterval(() => {
        const n = Date.now() - started.current
        setMs(n)
        if (n >= maxSeconds * 1000) r.stop()
      }, 200)
    } catch (e) {
      cleanup(); setState('idle')
      setError((e as DOMException)?.name === 'NotAllowedError' ? t.denied : t.noMic)
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {state === 'recording' ? (
          <button type="button" className="m-btn danger" onClick={() => rec.current?.stop()} aria-pressed="true">
            <Square aria-hidden="true" fill="currentColor" />{t.stop}
          </button>
        ) : (
          <button type="button" className="m-btn secondary" onClick={start} disabled={disabled || state === 'starting'} aria-busy={state === 'starting'}>
            <Mic aria-hidden="true" />{label}
          </button>
        )}
        {state === 'recording' ? (
          <span className="flex items-center gap-2 text-[14px]" role="timer" aria-live="off">
            <span className="size-2.5 animate-pulse rounded-full bg-[var(--danger)]" aria-hidden="true" />
            {fmt(t.recording, { time: formatTime(ms / 1000), max: formatTime(maxSeconds) })}
          </span>
        ) : null}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{state === 'recording' ? t.started : ''}</p>
      {error ? <p className="m-error" role="alert">{error}</p> : null}
    </div>
  )
}
