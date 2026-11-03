import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Check } from 'lucide-react'
import { JsonLd } from '@/components/JsonLd'
import { ProductCard } from '@/components/marketing/ProductCard'
import { ComingSoonBadge } from '@/components/marketing/ComingSoon'
import { productAvailability } from '@/server/site-features'
import { SampleList } from '@/components/marketing/SampleList'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { CtaBand } from '@/components/ui/CtaBand'
import { Faq } from '@/components/ui/Faq'
import { Section, SectionHeading } from '@/components/ui/Section'
import { Icon } from '@/components/Icon'
import { productHref, productIcon } from '@/config/nav'
import { PRODUCTS, PRODUCT_SLUGS, type ProductSlug } from '@/config/products'
import { APP_ROUTES } from '@/config/site'
import { withEngineLimits } from '@/config/engine-limits'
import { fmt, getMessages } from '@/i18n'
import { breadcrumbLd, buildMetadata, faqLd, softwareLd, webPageLd } from '@/lib/seo'

export const dynamicParams = false
export function generateStaticParams() {
  return PRODUCT_SLUGS.map((slug) => ({ slug }))
}

const isSlug = (s: string): s is ProductSlug => (PRODUCT_SLUGS as readonly string[]).includes(s)

export async function generateMetadata({ params }: PageProps<'/products/[slug]'>) {
  const { slug } = await params
  if (!isSlug(slug)) return {}
  const c = getMessages().products[slug]
  return buildMetadata({ title: c.seo.title, description: c.seo.description, path: `/products/${slug}` })
}

export default async function ProductPage({ params }: PageProps<'/products/[slug]'>) {
  const { slug } = await params
  if (!isSlug(slug)) notFound()
  const m = getMessages()
  const raw = m.products[slug]
  // Engine-dependent items stay hidden until confirmed in src/config/engine-limits.ts.
  const c = { ...raw, features: withEngineLimits(raw.features), specs: withEngineLimits(raw.specs), faq: withEngineLimits(raw.faq) }
  const def = PRODUCTS[slug]
  const name = m.common.products[slug].name
  const path = `/products/${slug}`
  const crumbs = [{ name: m.common.breadcrumbHome, path: '/' }, { name, path }]
  const samples = Object.entries(c.samples.items).map(([id, s]) => ({ id, title: s.title, caption: s.text || undefined }))
  const pp = m.common.productPage
  const on = productAvailability()

  return (
    <>
      <JsonLd nodes={[webPageLd(c.seo.title, c.seo.description, path), breadcrumbLd(crumbs), softwareLd(`Mimix ${name}`, c.seo.description, path), faqLd(c.faq)]} />
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute top-[-320px] left-[-240px] h-[560px] w-[560px] rounded-full opacity-25 glow" style={{ background: 'var(--gradient-brand)' }} />
        <div className="container-content relative grid items-start gap-12 pt-10 pb-16 md:pt-16 md:pb-24 lg:grid-cols-2 lg:gap-16">
          <div>
            <Breadcrumbs items={crumbs} />
            <p className="eyebrow inline-flex items-center gap-2"><Icon name={def.icon} size={16} />{c.hero.overline}{on[slug] ? null : <ComingSoonBadge />}</p>
            <h1 id="hero-title" className="mt-4 text-5xl font-bold lg:text-6xl">{c.hero.title}</h1>
            <p className="lead mt-6 max-w-[560px]">{c.hero.lead}</p>
            {on[slug] ? null : <p className="mt-4 max-w-[560px] text-text-muted" role="note">{m.common.soon.note}</p>}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={APP_ROUTES.signup} className="m-btn primary lg">{m.common.cta.startFree}<ArrowRight strokeWidth={1.75} aria-hidden="true" /></Link>
              <Link href="/pricing" className="m-btn secondary lg">{m.common.cta.seePricing}</Link>
            </div>
          </div>
          <div className="lg:pt-12">
            <h2 className="sr-only">{c.samples.title}</h2>
            <SampleList items={samples.slice(0, 2)} />
          </div>
        </div>
      </section>

      <Section labelledBy="steps-title" tone="raised">
        <SectionHeading id="steps-title" title={pp.howItWorks} />
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {c.steps.map((s, i) => (
            <li key={s.title} className="m-card" data-reveal style={{ ['--reveal-delay' as string]: `${i * 80}ms` }}>
              <span className="font-mono text-sm text-primary-text">{fmt(pp.stepLabel, { n: i + 1 })}</span>
              <h3 className="mt-2 font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="features-title">
        <SectionHeading id="features-title" title={pp.features} />
        <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {c.features.map((f) => (
            <li key={f.title} className="flex gap-4" data-reveal>
              <span className="mt-1 grid h-7 w-7 flex-none place-items-center rounded-full bg-surface-2 text-accent"><Check size={16} strokeWidth={2} aria-hidden="true" /></span>
              <div><h3 className="font-display text-lg font-semibold">{f.title}</h3><p className="mt-1 text-text-muted">{f.body}</p></div>
            </li>
          ))}
        </ul>
      </Section>

      <Section labelledBy="specs-title" tone="raised">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <SectionHeading id="specs-title" title={pp.specs} />
          <div className="relative overflow-x-auto" data-reveal tabIndex={0} role="region" aria-labelledby="specs-title">
            <table className="w-full min-w-[480px] border-collapse text-left">
              <caption className="sr-only">{fmt(pp.specsCaption, { product: name })}</caption>
              <tbody>
                {c.specs.map((r) => (
                  <tr key={r.label} className="border-b border-border">
                    <th scope="row" className="w-1/3 py-4 pr-6 align-top font-semibold">{r.label}</th>
                    <td className="py-4 text-text-muted">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {samples.length > 2 && (
        <Section labelledBy="more-samples-title">
          <SectionHeading id="more-samples-title" title={c.samples.title} />
          <div className="mt-10"><SampleList items={samples} columns={2} /></div>
        </Section>
      )}

      <Section labelledBy="faq-title" tone={samples.length > 2 ? 'raised' : 'plain'}>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <SectionHeading id="faq-title" title={m.common.faqTitle} />
          <Faq items={c.faq} />
        </div>
      </Section>

      <Section labelledBy="related-title">
        <SectionHeading id="related-title" title={m.common.relatedTitle} />
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {def.related.map((k) => <li key={k}><ProductCard href={productHref(k)} icon={productIcon(k)} title={m.common.products[k].name} body={m.common.products[k].short} soon={!on[k]} /></li>)}
        </ul>
      </Section>

      <CtaBand title={c.cta.title} body={c.cta.body} />
    </>
  )
}
