'use client'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { claimPlayback, releasePlayback } from '@/lib/audio-bus'
import { Spinner } from './Spinner'

export interface PlayerLabels { play: string; pause: string; seek: string; timeValue: string; loadError: string; retry: string; loading: string }

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m)
export const formatTime = (s: number) => { const t = Math.max(0, Math.round(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }

/**
 * Sample player with a waveform. Starting it pauses any other player on the page.
 * The waveform is a slider: arrow keys seek 5% per press, Home and End jump to the ends.
 */
export function AudioPlayer({ src, title, durationMs, peaks, labels }: { src: string; title: string; durationMs: number; peaks: number[]; labels: PlayerLabels }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const waveRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(durationMs / 1000)
  const owner = useRef({ pause: () => audioRef.current?.pause() })

  useEffect(() => {
    const a = audioRef.current
    const o = owner.current
    if (!a) return
    const onPlay = () => { setPlaying(true); setLoading(false) }
    const onPause = () => setPlaying(false)
    const onEnded = () => { setPlaying(false); setTime(0); a.currentTime = 0; releasePlayback(o) }
    const onTime = () => setTime(a.currentTime)
    const onMeta = () => { if (Number.isFinite(a.duration)) setDuration(a.duration) }
    const onWaiting = () => setLoading(true)
    const onCanPlay = () => setLoading(false)
    const onError = () => { setError(true); setLoading(false); setPlaying(false) }
    a.addEventListener('play', onPlay); a.addEventListener('pause', onPause); a.addEventListener('ended', onEnded)
    a.addEventListener('timeupdate', onTime); a.addEventListener('loadedmetadata', onMeta); a.addEventListener('waiting', onWaiting)
    a.addEventListener('canplay', onCanPlay); a.addEventListener('error', onError)
    return () => {
      a.removeEventListener('play', onPlay); a.removeEventListener('pause', onPause); a.removeEventListener('ended', onEnded)
      a.removeEventListener('timeupdate', onTime); a.removeEventListener('loadedmetadata', onMeta); a.removeEventListener('waiting', onWaiting)
      a.removeEventListener('canplay', onCanPlay); a.removeEventListener('error', onError)
      a.pause(); releasePlayback(o)
    }
  }, [])

  const toggle = useCallback(async () => {
    const a = audioRef.current
    if (!a) return
    if (!a.paused) { a.pause(); return }
    setError(false)
    claimPlayback(owner.current)
    setLoading(true)
    try { await a.play() } catch { setLoading(false); if (a.error) setError(true) }
  }, [])

  const seekTo = useCallback((seconds: number) => {
    const a = audioRef.current
    if (!a) return
    const t = Math.min(Math.max(0, seconds), duration)
    a.currentTime = t
    setTime(t)
  }, [duration])

  const seekFromPointer = (clientX: number) => {
    const rect = waveRef.current?.getBoundingClientRect()
    if (!rect) return
    seekTo(((clientX - rect.left) / rect.width) * duration)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = duration * 0.05
    const map: Record<string, number> = { ArrowRight: time + step, ArrowUp: time + step, ArrowLeft: time - step, ArrowDown: time - step, Home: 0, End: duration, PageUp: time + duration * 0.2, PageDown: time - duration * 0.2 }
    if (e.key in map) { e.preventDefault(); seekTo(map[e.key] as number) }
  }

  const progress = duration ? time / duration : 0
  const bars = peaks.length
  const label = playing ? fill(labels.pause, { title }) : fill(labels.play, { title })

  return (
    <div className="player">
      <audio ref={audioRef} src={src} preload="none" />
      <button type="button" className="player-btn" onClick={toggle} aria-label={label} aria-pressed={playing}>
        {loading ? <Spinner label={labels.loading} /> : error ? <RotateCcw strokeWidth={1.75} aria-hidden="true" /> : playing ? <Pause strokeWidth={1.75} aria-hidden="true" fill="currentColor" /> : <Play strokeWidth={1.75} aria-hidden="true" fill="currentColor" />}
      </button>
      <div
        ref={waveRef} className="player-wave" role="slider" tabIndex={0}
        aria-label={fill(labels.seek, { title })} aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(time)}
        aria-valuetext={fill(labels.timeValue, { current: formatTime(time), total: formatTime(duration) })}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seekFromPointer(e.clientX) }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) seekFromPointer(e.clientX) }}
      >
        <svg viewBox={`0 0 ${bars * 4} 40`} preserveAspectRatio="none" aria-hidden="true">
          {peaks.map((p, i) => {
            const h = Math.max(3, p * 36)
            return <rect key={i} className={`bar${i / bars < progress ? ' played' : ''}`} x={i * 4} y={(40 - h) / 2} width={2.4} height={h} rx={1.2} />
          })}
        </svg>
      </div>
      <span className="player-time" aria-hidden="true">{formatTime(playing || time ? time : duration)}</span>
      {error && <p className="sr-only" role="alert">{labels.loadError}</p>}
    </div>
  )
}
