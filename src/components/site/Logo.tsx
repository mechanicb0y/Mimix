import Link from 'next/link'
import { getMessages } from '@/i18n'

/** The Fork mark (Phase 2) as inline SVG. Gradient stops follow the theme through --mark-a/b. */
export function Mark({ id, className, size = 28 }: { id: string; className?: string; size?: number }) {
  return (
    <svg viewBox="138 298 748 428" width={Math.round((size * 748) / 428)} height={size} className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="180" y1="0" x2="844" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--mark-a)' }} />
          <stop offset="1" style={{ stopColor: 'var(--mark-b)' }} />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${id})`} strokeWidth="84" strokeLinecap="round" strokeLinejoin="round">
        <path d="M180 340 C 356 340 404 512 520 512" />
        <path d="M180 684 C 356 684 404 512 520 512" />
        <path d="M520 512 C 594 512 604 352 682 352 C 760 352 768 512 844 512" />
      </g>
    </svg>
  )
}

export function Logo({ id = 'mark-header', href = '/' }: { id?: string; href?: string }) {
  const m = getMessages()
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-md py-1 text-text no-underline" aria-label={m.common.a11y.home}>
      <Mark id={id} />
      <span className="font-display text-[22px] leading-none font-bold tracking-[-0.02em]">Mimix</span>
    </Link>
  )
}
