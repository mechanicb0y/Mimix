import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Icon } from '@/components/Icon'
import type { IconName } from '@/config/products'
import { ComingSoonBadge } from './ComingSoon'

export function ProductCard({ href, icon, title, body, headingLevel = 3, soon = false }: { href: string; icon: IconName; title: string; body: string; headingLevel?: 2 | 3 | 4; soon?: boolean }) {
  const H = headingLevel === 2 ? 'h2' : headingLevel === 4 ? 'h4' : 'h3'
  return (
    <Link href={href} className="m-card group flex h-full flex-col gap-3" data-reveal>
      <span className="flex items-start justify-between gap-2"><span className="icon-tile"><Icon name={icon} /></span>{soon ? <ComingSoonBadge /> : null}</span>
      <H className="font-display text-lg font-semibold">{title}</H>
      <p className="text-sm text-text-muted">{body}</p>
      <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" className="mt-auto text-primary-text transition-transform group-hover:translate-x-1" />
    </Link>
  )
}
