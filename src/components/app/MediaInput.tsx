'use client'
import { FileAudio, Upload } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { ApiClientError } from '@/lib/api-client'
import { uploadFile } from '@/lib/upload-client'
import { getMessages, fmt } from '@/i18n'
import { formatBytes, UPLOAD_LIMITS } from '@/config/uploads'
import { formatTime } from '@/components/ui/AudioPlayer'
import { Recorder } from '@/components/app/Recorder'

export interface ReadyMedia { uploadId: string; name: string; durationMs: number; url: string }

/** Reads the duration in the browser, for the cost estimate. The server measures again before charging. */
function measure(file: Blob): Promise<{ ms: number; url: string }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const el = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio')
    el.preload = 'metadata'
    el.onloadedmetadata = () => resolve({ ms: Number.isFinite(el.duration) ? Math.round(el.duration * 1000) : 0, url })
    el.onerror = () => resolve({ ms: 0, url })
    el.src = url
  })
}

/**
 * Pick, drop or record one audio or video file, upload it straight to storage, and report it with
 * its duration. Used by the Voice Changer, Voice Isolator, Speech to Text and Dubbing.
 */
export function MediaInput({ value, onChange, maxMs, error, allowRecord = true }: { value: ReadyMedia | null; onChange: (m: ReadyMedia | null) => void; maxMs: number; error?: string | null; allowRecord?: boolean }) {
  const t = getMessages().app.mediaInput
  const id = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const limit = UPLOAD_LIMITS.media
  const maxText = maxMs >= 3_600_000 ? `${maxMs / 3_600_000} h` : `${Math.round(maxMs / 60_000)} min`

  const take = async (file: Blob & { name?: string }) => {
    setMessage('')
    const name = file.name ?? t.recorded
    const { ms, url } = await measure(file)
    if (ms > maxMs) { setMessage(fmt(t.tooLong, { duration: formatTime(ms / 1000), max: maxText })); URL.revokeObjectURL(url); return }
    if (file.size > limit.maxBytes) { setMessage(fmt(getMessages().errors.app.fileTooLarge, { limit: formatBytes(limit.maxBytes) })); return }
    setProgress(0)
    try {
      const ext = file.type.includes('mp4') ? 'm4a' : 'webm'
      const u = await uploadFile(file, 'media', { filename: file.name ?? `recording.${ext}`, onProgress: setProgress })
      onChange({ uploadId: u.id, name, durationMs: ms, url })
    } catch (e) {
      setMessage(e instanceof ApiClientError ? (Object.values(e.fields)[0] ?? e.message) : getMessages().app.common.networkError)
    } finally { setProgress(null) }
  }

  const err = error ?? message
  if (value) {
    return (
      <div className="grid gap-2">
        <span className="m-label">{t.label}</span>
        <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[var(--border)] p-3">
          <FileAudio aria-hidden="true" size={18} />
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{fmt(t.ready, { name: value.name, duration: formatTime(value.durationMs / 1000) })}</span>
          <button type="button" className="m-btn ghost sm" onClick={() => onChange(null)}>{t.replace}</button>
        </div>
        <audio controls src={value.url} className="w-full" aria-label={value.name} />
        {err ? <p className="m-error" role="alert">{err}</p> : null}
      </div>
    )
  }
  return (
    <div className="grid gap-3">
      <span className="m-label" id={`${id}-l`}>{t.label}</span>
      <div className="grid justify-items-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border-strong)] p-6 text-center"
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void take(f) }}>
        <Upload aria-hidden="true" />
        <p className="text-[14px]">{t.dropHint} <button type="button" className="link" aria-describedby={`${id}-l`} onClick={() => fileRef.current?.click()}>{t.choose}</button></p>
        <p className="text-[13px] text-[var(--text-subtle)]">{fmt(t.accept, { size: formatBytes(limit.maxBytes) })}</p>
        <input ref={fileRef} type="file" className="sr-only" tabIndex={-1} aria-hidden="true" accept={limit.extensions.map((x) => `.${x}`).join(',')}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void take(f); e.target.value = '' }} />
        {progress !== null ? <progress className="h-1.5 w-full max-w-[320px]" max={1} value={progress} aria-label={fmt(t.uploading, { percent: Math.round(progress * 100) })} /> : null}
      </div>
      {allowRecord ? <Recorder label={t.record} maxSeconds={Math.min(600, maxMs / 1000)} onRecorded={(b) => void take(b)} disabled={progress !== null} /> : null}
      {err ? <p className="m-error" role="alert">{err}</p> : null}
    </div>
  )
}
