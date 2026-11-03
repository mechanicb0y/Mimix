import { cn } from '@/lib/cn'

/** Vertical rhythm: 96px between sections on desktop, 64px on phones. */
export function Section({ id, children, className, labelledBy, tone = 'plain' }: { id?: string; children: React.ReactNode; className?: string; labelledBy?: string; tone?: 'plain' | 'raised' }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn('py-16 md:py-24', tone === 'raised' && 'border-y border-border bg-surface', className)}>
      <div className="container-content">{children}</div>
    </section>
  )
}

export function SectionHeading({ id, overline, title, lead, align = 'left', as: Tag = 'h2' }: { id: string; overline?: string; title: string; lead?: string; align?: 'left' | 'center'; as?: 'h2' | 'h1' }) {
  return (
    <div className={cn('max-w-[720px]', align === 'center' && 'mx-auto text-center')} data-reveal>
      {overline && <p className="eyebrow">{overline}</p>}
      <Tag id={id} className={cn('mt-3 font-semibold', Tag === 'h1' ? 'text-5xl lg:text-6xl' : 'text-3xl md:text-4xl')}>{title}</Tag>
      {lead && <p className="lead mt-4">{lead}</p>}
    </div>
  )
}
