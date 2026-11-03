import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getMessages } from '@/i18n'
import { APP_ROUTES } from '@/config/site'

export function CtaBand({ title, body, primary, secondary }: { title: string; body: string; primary?: { href: string; label: string }; secondary?: { href: string; label: string } }) {
  const m = getMessages().common
  const p = primary ?? { href: APP_ROUTES.signup, label: m.cta.startFree }
  const s = secondary ?? { href: '/pricing', label: m.cta.seePricing }
  return (
    <section aria-labelledby="cta-title" className="py-16 md:py-24">
      <div className="container-content">
        <div className="relative overflow-hidden rounded-[24px] border border-border bg-surface px-6 py-12 text-center md:px-12 md:py-16" data-reveal>
          <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[640px] -translate-x-1/2 rounded-full opacity-60 glow" style={{ background: 'var(--gradient-brand)' }} />
          <div className="relative">
            <h2 id="cta-title" className="text-3xl font-semibold md:text-4xl">{title}</h2>
            <p className="lead mx-auto mt-4 max-w-[560px]">{body}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={p.href} className="m-btn primary lg">{p.label}<ArrowRight strokeWidth={1.75} aria-hidden="true" /></Link>
              <Link href={s.href} className="m-btn secondary lg">{s.label}</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
