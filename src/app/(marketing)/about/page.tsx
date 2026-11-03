import Link from 'next/link'
import { JsonLd } from '@/components/JsonLd'
import { Mark } from '@/components/site/Logo'
import { CtaBand } from '@/components/ui/CtaBand'
import { Section, SectionHeading } from '@/components/ui/Section'
import { getMessages } from '@/i18n'
import { buildMetadata, organizationLd, webPageLd } from '@/lib/seo'

const m = getMessages()
const a = m.about
const path = '/about'

export const metadata = buildMetadata({ title: a.seo.title, description: a.seo.description, path })

export default function AboutPage() {
  return (
    <>
      <JsonLd nodes={[organizationLd(), { ...webPageLd(a.seo.title, a.seo.description, path), '@type': 'AboutPage' }]} />
      <section aria-labelledby="hero-title" className="pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="container-content grid items-center gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div>
            <p className="eyebrow">{a.hero.overline}</p>
            <h1 id="hero-title" className="mt-4 text-5xl font-bold lg:text-7xl">{a.hero.title}</h1>
            <p className="lead mt-6 max-w-[620px]">{a.hero.lead}</p>
          </div>
          <div className="flex justify-center" aria-hidden="true"><Mark id="mark-about" size={180} className="max-w-full" /></div>
        </div>
      </section>
      <Section labelledBy="story-title" tone="raised">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <SectionHeading id="story-title" title={a.story.title} />
          <div className="space-y-6 text-lg leading-[30px] text-text-muted" data-reveal>{a.story.paragraphs.map((p) => <p key={p}>{p}</p>)}</div>
        </div>
      </Section>
      <Section labelledBy="values-title">
        <SectionHeading id="values-title" title={a.values.title} />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {a.values.items.map((v) => <li key={v.title} className="m-card" data-reveal><h3 className="font-display text-lg font-semibold">{v.title}</h3><p className="mt-2 text-sm text-text-muted">{v.body}</p></li>)}
        </ul>
      </Section>
      <Section labelledBy="safety-title" tone="raised">
        <div className="max-w-[720px]">
          <h2 id="safety-title" className="text-3xl font-semibold md:text-4xl">{a.safety.title}</h2>
          <p className="lead mt-4">{a.safety.body}</p>
          <Link href="/legal/voice-cloning-policy" className="link mt-6 inline-block">{a.safety.cta}</Link>
        </div>
      </Section>
      <CtaBand title={a.cta.title} body={a.cta.body} secondary={{ href: '/contact-sales', label: m.common.cta.contactSales }} />
    </>
  )
}
