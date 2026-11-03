import { AudioPlayer } from '@/components/ui/AudioPlayer'
import { playerLabels } from '@/components/ui/player-labels'
import { sampleMeta } from '@/lib/voice/samples'

/** A list of sample clips. All players share the audio bus, so only one plays at a time. */
export function SampleList({ items, columns = 1 }: { items: Array<{ id: string; title: string; caption?: string }>; columns?: 1 | 2 }) {
  const labels = playerLabels()
  return (
    <ul className={`grid gap-4 ${columns === 2 ? 'md:grid-cols-2' : ''}`}>
      {items.map((it) => {
        const meta = sampleMeta(it.id)
        return (
          <li key={it.id} className="m-card p-4 sm:p-5" data-reveal>
            <p className="mb-3 text-sm font-semibold">{it.title}</p>
            {it.caption && <p className="-mt-2 mb-3 text-sm text-text-muted">“{it.caption}”</p>}
            <AudioPlayer src={meta.src} title={it.title} durationMs={meta.durationMs} peaks={meta.peaks} labels={labels} />
          </li>
        )
      })}
    </ul>
  )
}
