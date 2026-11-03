import { Hourglass, LoaderCircle } from 'lucide-react'

/**
 * Loading indicator. Animated ring normally; under prefers-reduced-motion the ring is hidden and a
 * still hourglass with the label shows instead (Phase 1 fix).
 */
export function Spinner({ label, showLabel = false }: { label: string; showLabel?: boolean }) {
  return (
    <span className="m-spinner">
      <span className="m-spinner__anim" aria-hidden="true"><LoaderCircle size={18} strokeWidth={1.75} /></span>
      <span className="m-spinner__still" aria-hidden="true"><Hourglass size={16} strokeWidth={1.75} aria-hidden="true" />{label}</span>
      <span className={showLabel ? 'm-spinner__label' : 'sr-only'}>{label}</span>
    </span>
  )
}
