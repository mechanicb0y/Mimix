'use client'
import { Download } from 'lucide-react'
import { AudioPlayer } from '@/components/ui/AudioPlayer'
import { playerLabels } from '@/components/ui/player-labels'
import { getMessages, fmt } from '@/i18n'

export interface GenerationLike { id: string; audioUrl: string | null; downloadUrl: string | null; durationMs: number | null; peaks: number[]; mimeType: string | null; text?: string | null }

export function GenerationPlayer({ g, title }: { g: GenerationLike; title: string }) {
  const t = getMessages().app.common
  if (!g.audioUrl) return null
  const fmtName = g.mimeType === 'audio/mpeg' ? 'MP3' : 'WAV'
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1"><AudioPlayer src={g.audioUrl} title={title} durationMs={g.durationMs ?? 0} peaks={g.peaks.length ? g.peaks : Array(48).fill(0.3)} labels={playerLabels()} /></div>
      {g.downloadUrl ? <a href={g.downloadUrl} className="m-btn secondary sm" download aria-label={`${fmt(t.downloadAs, { format: fmtName })}: ${title}`}><Download aria-hidden="true" />{fmtName}</a> : null}
    </div>
  )
}
