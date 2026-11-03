import { Check } from 'lucide-react'
import { JsonLd } from '@/components/JsonLd'
import { ContactSalesForm } from '@/components/marketing/ContactSalesForm'
import { SUPPORT_EMAIL } from '@/config/site'
import { getMessages } from '@/i18n'
import { buildMetadata, webPageLd } from '@/lib/seo'

const c = getMessages().contactSales
const path = '/contact-sales'
export const metadata = buildMetadata({ title: c.seo.title, description: c.seo.description, path })

export default function ContactSalesPage() {
  return (
    <>
      <JsonLd nodes={[{ ...webPageLd(c.seo.title, c.seo.description, path), '@type': 'ContactPage' }]} />
      <section aria-labelledby="hero-title" className="pt-12 pb-16 md:pt-20">
        <div className="container-content grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div>
            <p className="eyebrow">{c.hero.overline}</p>
            <h1 id="hero-title" className="mt-4 text-5xl font-bold">{c.hero.title}</h1>
            <p className="lead mt-6">{c.hero.lead}</p>
            <ul className="mt-8 space-y-3">
              {c.points.map((p) => <li key={p} className="flex gap-3"><Check size={20} strokeWidth={2} aria-hidden="true" className="mt-0.5 flex-none text-accent" /><span className="text-text-muted">{p}</span></li>)}
            </ul>
          </div>
          <ContactSalesForm labels={c.form} supportEmail={SUPPORT_EMAIL} />
        </div>
      </section>
    </>
  )
}
