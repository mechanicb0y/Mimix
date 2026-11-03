import Link from 'next/link'
import { Check } from 'lucide-react'
import { ReportForm } from '@/components/safety/ReportForm'
import { getSession } from '@/server/session'
import { getMessages } from '@/i18n'
import { buildMetadata } from '@/lib/seo'

const c = getMessages().safety.report
export const metadata = buildMetadata({ title: c.seo.title, description: c.seo.description, path: '/report' })
export const dynamic = 'force-dynamic'

export default async function ReportPage({ searchParams }: PageProps<'/report'>) {
  const sp = await searchParams
  const type = sp.type === 'generation' ? 'generation' : 'voice'
  const id = typeof sp.id === 'string' ? sp.id.slice(0, 80) : ''
  const s = await getSession()
  return (
    <section aria-labelledby="hero-title" className="pt-12 pb-16 md:pt-20">
      <div className="container-content grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <p className="eyebrow">{c.overline}</p>
          <h1 id="hero-title" className="mt-4 text-5xl font-bold">{c.title}</h1>
          <p className="lead mt-6">{c.lead}</p>
          <ul className="mt-8 space-y-3">
            {c.points.map((p) => <li key={p} className="flex gap-3"><Check size={20} strokeWidth={2} aria-hidden="true" className="mt-0.5 flex-none text-accent" /><span className="text-text-muted">{p}</span></li>)}
          </ul>
          <Link href="/check-audio" className="m-btn secondary mt-8">{c.checkLink}</Link>
        </div>
        <ReportForm initial={{ type, id }} signedInEmail={s?.user.email ?? null} />
      </div>
    </section>
  )
}
