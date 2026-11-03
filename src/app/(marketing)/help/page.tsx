import { Mail } from 'lucide-react'
import { JsonLd } from '@/components/JsonLd'
import { HelpSearch } from '@/components/marketing/HelpSearch'
import { Section } from '@/components/ui/Section'
import { SUPPORT_EMAIL } from '@/config/site'
import { getMessages } from '@/i18n'
import { buildMetadata, faqLd, webPageLd } from '@/lib/seo'

const h = getMessages().help
const path = '/help'
export const metadata = buildMetadata({ title: h.seo.title, description: h.seo.description, path })

export default function HelpPage() {
  return (
    <>
      <JsonLd nodes={[webPageLd(h.seo.title, h.seo.description, path), faqLd(h.topics.flatMap((t) => t.items))]} />
      <section aria-labelledby="hero-title" className="pt-12 pb-16 md:pt-20">
        <div className="container-content">
          <div className="mx-auto max-w-[720px] text-center">
            <p className="eyebrow">{h.hero.overline}</p>
            <h1 id="hero-title" className="mt-4 text-5xl font-bold">{h.hero.title}</h1>
            <p className="lead mt-6">{h.hero.lead}</p>
          </div>
          <div className="mt-10"><HelpSearch topics={h.topics} labels={{ ...h.search, topicsTitle: h.topicsTitle }} /></div>
        </div>
      </section>
      <Section labelledBy="contact-title" tone="raised">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="contact-title" className="text-3xl font-semibold">{h.contact.title}</h2>
            <p className="lead mt-2">{h.contact.body}</p>
          </div>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="m-btn primary lg"><Mail strokeWidth={1.75} aria-hidden="true" />{h.contact.cta}</a>
        </div>
      </Section>
    </>
  )
}
