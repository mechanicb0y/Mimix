import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { JsonLd } from '@/components/JsonLd'
import { ProductCard } from '@/components/marketing/ProductCard'
import { productAvailability } from '@/server/site-features'
import { SampleList } from '@/components/marketing/SampleList'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { CtaBand } from '@/components/ui/CtaBand'
import { Section, SectionHeading } from '@/components/ui/Section'
import { Icon } from '@/components/Icon'
import { productHref, productIcon } from '@/config/nav'
import { USE_CASES, USE_CASE_SLUGS, type UseCaseSlug } from '@/config/products'
import { APP_ROUTES } from '@/config/site'
import { fmt, getMessages } from '@/i18n'
import { breadcrumbLd, buildMetadata, webPageLd } from '@/lib/seo'

export const dynamicParams = false
export function generateStaticParams() { return USE_CASE_SLUGS.map((slug) => ({ slug })) }
const isSlug = (s: string): s is UseCaseSlug => (USE_CASE_SLUGS as readonly string[]).includes(s)

export async function generateMetadata({ params }: PageProps<'/use-cases/[slug]'>) {
  const { slug } = await params
  if (!isSlug(slug)) return {}
  const c = getMessages().useCases[slug]
  return buildMetadata({ title: c.seo.title, description: c.seo.description, path: `/use-cases/${slug}` })
}

export default async function UseCasePage({ params }: PageProps<'/use-cases/[slug]'>) {
  const { slug } = await params
  if (!isSlug(slug)) notFound()
  const m = getMessages()
  const c = m.useCases[slug]
  const def = USE_CASES[slug]
  const path = `/use-cases/${slug}`
  const crumbs = [{ name: m.common.breadcrumbHome, path: '/' }, { name: m.common.useCases[slug].name, path }]
  const business = slug === 'business' || slug === 'education'
  return (
    <>
      <JsonLd nodes={[webPageLd(c.seo.title, c.seo.description, path), breadcrumbLd(crumbs)]} />
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute top-[-300px] right-[-220px] h-[560px] w-[560px] rounded-full opacity-25 glow" style={{ background: 'var(--gradient-brand)' }} />
        <div className="container-content relative grid items-center gap-12 pt-10 pb-16 md:pt-16 md:pb-24 lg:grid-cols-2">
          <div>
            <Breadcrumbs items={crumbs} />
            <p className="eyebrow inline-flex items-center gap-2"><Icon name={def.icon} size={16} />{c.hero.overline}</p>
            <h1 id="hero-title" className="mt-4 text-5xl font-bold lg:text-6xl">{c.hero.title}</h1>
            <p className="lead mt-6">{c.hero.lead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={APP_ROUTES.signup} className="m-btn primary lg">{m.common.cta.startFree}<ArrowRight strokeWidth={1.75} aria-hidden="true" /></Link>
              <Link href={business ? '/contact-sales' : '/pricing'} className="m-btn secondary lg">{business ? m.common.cta.contactSales : m.common.cta.seePricing}</Link>
            </div>
          </div>
          <div>
            <h2 className="sr-only">{c.sampleTitle}</h2>
            <SampleList items={[{ id: `usecase-${slug}`, title: c.sampleTitle, caption: c.sampleText }]} />
          </div>
        </div>
      </section>

      <Section labelledBy="problems-title" tone="raised">
        <SectionHeading id="problems-title" title={m.common.useCasePage.challenges} />
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {c.problems.map((p) => <li key={p.title} className="m-card" data-reveal><h3 className="font-display text-lg font-semibold">{p.title}</h3><p className="mt-2 text-text-muted">{p.body}</p></li>)}
        </ul>
      </Section>

      <Section labelledBy="workflow-title">
        <SectionHeading id="workflow-title" title={c.workflow.title} />
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {c.workflow.steps.map((s, i) => (
            <li key={s.title} className="relative border-l-2 border-primary pl-5" data-reveal>
              <span className="font-mono text-sm text-primary-text">{fmt(m.common.productPage.stepLabel, { n: i + 1 })}</span>
              <h3 className="mt-1 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="tools-title" tone="raised">
        <SectionHeading id="tools-title" title={m.common.useCasePage.tools} />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {def.products.map((k) => <li key={k}><ProductCard href={productHref(k)} icon={productIcon(k)} title={m.common.products[k].name} body={m.common.products[k].short} soon={!productAvailability()[k]} /></li>)}
        </ul>
      </Section>
      <CtaBand title={c.cta.title} body={c.cta.body} secondary={business ? { href: '/contact-sales', label: m.common.cta.contactSales } : undefined} />
    </>
  )
}
