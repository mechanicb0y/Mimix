import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { JsonLd } from '@/components/JsonLd'
import { mixerLabels } from '@/components/marketing/labels'
import { MixerPlayground } from '@/components/marketing/MixerPlayground'
import { demoMixDefaults, demoMixVoices } from '@/server/demo-mixer'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { CtaBand } from '@/components/ui/CtaBand'
import { Faq } from '@/components/ui/Faq'
import { Section, SectionHeading } from '@/components/ui/Section'
import { APP_ROUTES } from '@/config/site'
import { fmt, getMessages } from '@/i18n'
import { breadcrumbLd, buildMetadata, faqLd, softwareLd, webPageLd } from '@/lib/seo'
import { engineNote } from '@/components/marketing/labels'
import { ComingSoonBadge, ComingSoonNote } from '@/components/marketing/ComingSoon'
import { isAvailable } from '@/server/site-features'

const m = getMessages()
const x = m.mixer
const path = '/voice-mixer'

export const metadata = buildMetadata({ title: x.seo.title, description: x.seo.description, path })

/** Lineage diagram: three sources feeding one mix, with weights. */
function LineageDiagram() {
  const ex = x.lineage.example
  const sources = [{ name: 'Wren', pct: 50 }, { name: 'Marlow', pct: 30 }, { name: 'Koa', pct: 20 }]
  return (
    <figure className="m-card" data-reveal>
      <figcaption className="eyebrow text-text-muted">{ex.title}</figcaption>
      <svg viewBox="0 0 480 220" className="mt-4 w-full" role="img" aria-label={`${sources.map((s) => `${s.name} ${s.pct}%`).join(', ')} → ${ex.result}`}>
        <defs>
          <linearGradient id="lin-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style={{ stopColor: 'var(--mark-a)' }} /><stop offset="1" style={{ stopColor: 'var(--mark-b)' }} /></linearGradient>
        </defs>
        {sources.map((s, i) => {
          const y = 40 + i * 70
          return (
            <g key={s.name}>
              <path d={`M140 ${y} C 220 ${y}, 240 110, 320 110`} fill="none" stroke="url(#lin-g)" strokeWidth={4 + s.pct / 6} strokeLinecap="round" />
              <rect x="8" y={y - 22} width="132" height="44" rx="10" fill="var(--surface-2)" stroke="var(--border-strong)" />
              <text x="24" y={y + 5} fill="var(--text)" fontSize="15" fontWeight="600" fontFamily="var(--font-body)">{s.name}</text>
              <text x="124" y={y + 5} fill="var(--text-muted)" fontSize="13" textAnchor="end" fontFamily="var(--font-mono)">{s.pct}%</text>
            </g>
          )
        })}
        <rect x="320" y="84" width="152" height="52" rx="12" fill="var(--primary)" />
        <text x="396" y="115" fill="var(--on-primary)" fontSize="15" fontWeight="700" textAnchor="middle" fontFamily="var(--font-body)">{ex.result.split(' (')[0]}</text>
      </svg>
      <p className="mt-4 text-sm text-text-muted">{ex.licence}</p>
    </figure>
  )
}

export default function VoiceMixerPage() {
  const crumbs = [{ name: m.common.breadcrumbHome, path: '/' }, { name: m.common.products['voice-mixer'].name, path }]
  const note = engineNote()
  const on = isAvailable('voice-mixer')
  return (
    <>
      <JsonLd nodes={[webPageLd(x.seo.title, x.seo.description, path), breadcrumbLd(crumbs), softwareLd('Mimix Voice Mixer', x.seo.description, path), faqLd(x.faq)]} />
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute top-[-300px] left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full opacity-30 glow" style={{ background: 'var(--gradient-brand)' }} />
        <div className="container-content relative pt-10 pb-12 md:pt-16">
          <Breadcrumbs items={crumbs} />
          <div className="max-w-[760px]">
            <p className="eyebrow inline-flex items-center gap-2">{x.hero.overline}{on ? null : <ComingSoonBadge />}</p>
            <h1 id="hero-title" className="mt-4 text-5xl font-bold lg:text-6xl">{x.hero.title}</h1>
            <p className="lead mt-6">{x.hero.lead}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="play-title" className="pb-16 md:pb-24">
        <div className="container-content">
          <h2 id="play-title" className="mb-6 font-display text-2xl font-semibold">{x.playground.title}</h2>
          {on ? (
            <>
              <MixerPlayground voices={demoMixVoices().map(({ id, name }) => ({ id, name }))} labels={mixerLabels()} defaults={demoMixDefaults()} />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-text-muted">{x.playground.saveNote}</p>
                <Link href={APP_ROUTES.signup} className="m-btn secondary flex-none">{x.playground.save}<ArrowRight strokeWidth={1.75} aria-hidden="true" /></Link>
              </div>
              {note && <p className="mt-4 text-xs text-text-subtle">{note}</p>}
            </>
          ) : <ComingSoonNote title={m.common.products['voice-mixer'].name} />}
        </div>
      </section>

      <Section labelledBy="how-title" tone="raised">
        <SectionHeading id="how-title" overline={x.how.overline} title={x.how.title} />
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {x.how.steps.map((s, i) => (
            <li key={s.title} className="m-card" data-reveal>
              <span className="font-mono text-sm text-primary-text">{fmt(m.common.productPage.stepLabel, { n: i + 1 })}</span>
              <h3 className="mt-2 font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="lineage-title">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading id="lineage-title" overline={x.lineage.overline} title={x.lineage.title} />
            <p className="lead mt-4" data-reveal>{x.lineage.body}</p>
          </div>
          <LineageDiagram />
        </div>
      </Section>

      <Section labelledBy="faq-title" tone="raised">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <SectionHeading id="faq-title" title={m.common.faqTitle} />
          <Faq items={x.faq} />
        </div>
      </Section>
      <CtaBand title={x.cta.title} body={x.cta.body} />
    </>
  )
}
