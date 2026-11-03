import { getMessages } from '@/i18n'

/** Small "Coming soon" tag for a tool the current voice engine can't run yet. */
export function ComingSoonBadge({ className = '' }: { className?: string }) {
  return <span className={`m-badge ${className}`}>{getMessages().common.soon.badge}</span>
}

/** Stands in for a live demo or call to action when the tool is off. */
export function ComingSoonNote({ title }: { title: string }) {
  const s = getMessages().common.soon
  return (
    <div className="m-card grid gap-2" role="note">
      <p className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold">{title}<ComingSoonBadge /></p>
      <p className="text-text-muted">{s.note}</p>
    </div>
  )
}
