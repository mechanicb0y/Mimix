import Link from 'next/link'
import { ArrowRight, Fingerprint, GitBranch, ShieldCheck } from 'lucide-react'
import { JsonLd } from '@/components/JsonLd'
import { CodeSample } from '@/components/marketing/CodeSample'
import { codeSamples } from '@/components/marketing/code-samples'
import { HeroDemo } from '@/components/marketing/HeroDemo'
import { engineNote, heroDemoProps, mixerLabels } from '@/components/marketing/labels'
import { MixerPlayground } from '@/components/marketing/MixerPlayground'
import { demoMixDefaults, demoMixVoices } from '@/server/demo-mixer'
import { ComingSoonBadge, ComingSoonNote } from '@/components/marketing/ComingSoon'
import { productAvailability } from '@/server/site-features'
import { ProductCard } from '@/components/marketing/ProductCard'
import { SampleList } from '@/components/marketing/SampleList'
import { CtaBand } from '@/components/ui/CtaBand'
import { Faq } from '@/components/ui/Faq'
import { Section, SectionHeading } from '@/components/ui/Section'
import { Icon } from '@/components/Icon'
import { PRODUCT_GROUPS, productHref, productIcon, iconForUseCase } from '@/config/nav'
import { USE_CASE_SLUGS } from '@/config/products'
import { APP_ROUTES } from '@/config/site'
import { getMessages } from '@/i18n'
import { buildMetadata, faqLd, organizationLd, softwareLd, websiteLd } from '@/lib/seo'
import { DEMO_MAX_CHARS } from '@/lib/validation'

const m = getMessages()
const h = m.home

export function generateMetadata() {
  const seo = productAvailability()['voice-mixer'] ? h.seo : h.seoNoMixer
  return buildMetadata({ title: seo.title, description: seo.description, path: '/' })
}

export default function HomePage() {
  const demo = heroDemoProps()
  const trustIcons = [ShieldCheck, GitBranch, Fingerprint]
  const on = productAvailability()
  const mixerOn = on['voice-mixer']
  const hero = mixerOn ? h.hero : { ...h.hero, ...h.heroNoMixer }
  const seo = mixerOn ? h.seo : h.seoNoMixer
  return (
    <>
      <JsonLd nodes={[organizationLd(), websiteLd(), softwareLd('Mimix', seo.description, '/'), faqLd(h.faq)]} />

      {/* Hero */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute top-[-280px] right-[-200px] h-[640px] w-[640px] rounded-full opacity-40 glow" style={{ background: 'var(--gradient-brand)' }} />
        <div className="container-content relative grid items-center gap-12 pt-12 pb-16 md:pt-20 md:pb-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div>
            <p className="eyebrow">{hero.overline}</p>
            <h1 id="hero-title" className="mt-4 text-5xl font-bold lg:text-7xl">{hero.title}</h1>
            <p className="lead mt-6 max-w-[560px]">{hero.lead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={APP_ROUTES.signup} className="m-btn primary lg">{m.common.cta.startFree}<ArrowRight strokeWidth={1.75} aria-hidden="true" /></Link>
              {mixerOn
                ? <Link href="/voice-mixer" className="m-btn secondary lg">{h.hero.secondaryCta}</Link>
                : <Link href="/products/text-to-speech" className="m-btn secondary lg">{m.common.cta.exploreTts}</Link>}
            </div>
            <p className="mt-4 text-sm text-text-subtle">{m.common.cta.noCard}</p>
          </div>
          <HeroDemo labels={demo.labels} voices={demo.voices} maxChars={DEMO_MAX_CHARS} engineNote={engineNote()} />
        </div>
      </section>

      {/* Products */}
      <Section labelledBy="products-title" tone="raised">
        <SectionHeading id="products-title" overline={h.products.overline} title={h.products.title} lead={h.products.lead} />
        <div className="mt-12 space-y-10">
          {PRODUCT_GROUPS.map((g) => (
            <div key={g.key}>
              <h3 className="eyebrow text-text-muted">{m.common.nav.groups[g.key]}</h3>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {g.items.map((k) => <li key={k}><ProductCard href={productHref(k)} icon={productIcon(k)} title={m.common.products[k].name} body={m.common.products[k].short} headingLevel={4} soon={!on[k]} /></li>)}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Samples */}
      <Section labelledBy="samples-title">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <SectionHeading id="samples-title" overline={h.samples.overline} title={h.samples.title} lead={h.samples.lead} />
          <SampleList items={h.samples.items.map((it) => ({ id: `home-${it.voice}`, title: it.title, caption: it.text }))} columns={2} />
        </div>
      </Section>

      {/* Voice Mixer spotlight */}
      <Section labelledBy="mixer-title" tone="raised">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading id="mixer-title" overline={h.mixer.overline} title={h.mixer.title} lead={h.mixer.lead} />
            {mixerOn ? null : <ComingSoonBadge className="mt-4" />}
            <ul className="mt-6 space-y-3" data-reveal>
              {h.mixer.points.map((pt) => <li key={pt} className="flex gap-3 text-text-muted"><span aria-hidden="true" className="mt-2 h-2 w-2 flex-none rounded-full bg-primary" />{pt}</li>)}
            </ul>
            <Link href="/voice-mixer" className="m-btn secondary mt-8">{m.common.cta.exploreMixer}<ArrowRight strokeWidth={1.75} aria-hidden="true" /></Link>
          </div>
          <div data-reveal>
            {mixerOn ? (
              <>
                <MixerPlayground voices={demoMixVoices().map(({ id, name }) => ({ id, name }))} labels={{ ...mixerLabels(), preview: h.mixer.teaser.preview }} compact defaults={demoMixDefaults().slice(0, 2)} />
                <p className="m-hint">{h.mixer.teaser.caption}</p>
              </>
            ) : <ComingSoonNote title={m.common.products['voice-mixer'].name} />}
          </div>
        </div>
      </Section>

      {/* Trust */}
      <Section labelledBy="trust-title">
        <SectionHeading id="trust-title" overline={h.trust.overline} title={h.trust.title} />
        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {h.trust.items.map((it, i) => {
            const I = trustIcons[i] ?? ShieldCheck
            return (
              <li key={it.title} className="m-card" data-reveal style={{ ['--reveal-delay' as string]: `${i * 80}ms` }}>
                <span className="icon-tile"><I strokeWidth={1.75} aria-hidden="true" /></span>
                <h3 className="mt-4 font-display text-lg font-semibold">{it.title}</h3>
                <p className="mt-2 text-sm text-text-muted">{it.body}</p>
              </li>
            )
          })}
        </ul>
        <Link href="/legal/voice-cloning-policy" className="link mt-8 inline-block">{h.trust.cta}</Link>
      </Section>

      {/* Use cases */}
      <Section labelledBy="usecases-title" tone="raised">
        <SectionHeading id="usecases-title" overline={h.useCases.overline} title={h.useCases.title} />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {USE_CASE_SLUGS.map((s) => (
            <li key={s}>
              <Link href={`/use-cases/${s}`} className="m-card flex h-full flex-col gap-3" data-reveal>
                <span className="icon-tile"><Icon name={iconForUseCase(s)} /></span>
                <h3 className="font-display text-lg font-semibold">{m.common.useCases[s].name}</h3>
                <p className="text-sm text-text-muted">{m.common.useCases[s].short}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* Developers */}
      <Section labelledBy="dev-title">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading id="dev-title" overline={h.developers.overline} title={h.developers.title} lead={h.developers.lead} />
            <ul className="mt-6 space-y-3" data-reveal>
              {h.developers.points.map((pt) => <li key={pt} className="flex gap-3 text-text-muted"><span aria-hidden="true" className="mt-2 h-2 w-2 flex-none rounded-full bg-primary" />{pt}</li>)}
            </ul>
            <Link href="/developers" className="m-btn secondary mt-8">{m.common.cta.readDocs}<ArrowRight strokeWidth={1.75} aria-hidden="true" /></Link>
          </div>
          <div data-reveal className="min-w-0">
            <CodeSample tabs={codeSamples()} labels={m.developers.quickstart} />
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section labelledBy="faq-title" tone="raised">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <SectionHeading id="faq-title" title={m.common.faqTitle} />
          <Faq items={h.faq} />
        </div>
      </Section>

      <CtaBand title={h.cta.title} body={h.cta.body} />
    </>
  )
}
