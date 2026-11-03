import Link from 'next/link'
import { ArrowRight, Info } from 'lucide-react'
import { JsonLd } from '@/components/JsonLd'
import { CodeSample } from '@/components/marketing/CodeSample'
import { codeSamples, streamingSample } from '@/components/marketing/code-samples'
import { CtaBand } from '@/components/ui/CtaBand'
import { Section, SectionHeading } from '@/components/ui/Section'
import { APP_ROUTES } from '@/config/site'
import { fmt, getMessages } from '@/i18n'
import { buildMetadata, softwareLd, webPageLd } from '@/lib/seo'

const m = getMessages()
const d = m.developers
const path = '/developers'

export const metadata = buildMetadata({ title: d.seo.title, description: d.seo.description, path })

export default function DevelopersPage() {
  return (
    <>
      <JsonLd nodes={[webPageLd(d.seo.title, d.seo.description, path), softwareLd('Mimix API', d.seo.description, path)]} />
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute top-[-260px] right-[-200px] h-[560px] w-[560px] rounded-full opacity-25 glow" style={{ background: 'var(--gradient-brand)' }} />
        <div className="container-content relative grid items-center gap-12 pt-12 pb-16 md:pt-20 md:pb-24 lg:grid-cols-2">
          <div>
            <p className="eyebrow">{d.hero.overline}</p>
            <h1 id="hero-title" className="mt-4 text-5xl font-bold lg:text-6xl">{d.hero.title}</h1>
            <p className="lead mt-6">{d.hero.lead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={APP_ROUTES.signup} className="m-btn primary lg">{d.hero.primary}<ArrowRight strokeWidth={1.75} aria-hidden="true" /></Link>
              <Link href="#quickstart" className="m-btn secondary lg">{d.hero.secondary}</Link>
            </div>
            <p className="mt-6 flex gap-2 text-sm text-text-subtle"><Info size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 flex-none" />{d.status}</p>
          </div>
          <div className="min-w-0"><CodeSample tabs={codeSamples()} labels={d.quickstart} /></div>
        </div>
      </section>

      <Section id="quickstart" labelledBy="qs-title" tone="raised">
        <SectionHeading id="qs-title" overline={d.quickstart.overline} title={d.quickstart.title} />
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {d.quickstart.steps.map((s, i) => (
            <li key={s.title} className="m-card" data-reveal>
              <span className="font-mono text-sm text-primary-text">{fmt(m.common.productPage.stepLabel, { n: i + 1 })}</span>
              <h3 className="mt-2 font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="streaming" labelledBy="stream-title">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading id="stream-title" overline={d.streaming.overline} title={d.streaming.title} />
            <p className="lead mt-4" data-reveal>{d.streaming.body}</p>
          </div>
          <div className="min-w-0" data-reveal><CodeSample tabs={streamingSample()} labels={d.quickstart} /></div>
        </div>
      </Section>

      <Section labelledBy="feat-title" tone="raised">
        <SectionHeading id="feat-title" title={d.features.title} />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {d.features.items.map((f) => (
            <li key={f.title} className="m-card" data-reveal>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-text-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section labelledBy="ep-title">
        <SectionHeading id="ep-title" title={d.endpoints.title} />
        <div className="relative mt-10 overflow-x-auto rounded-[16px] border border-border" data-reveal tabIndex={0} role="region" aria-labelledby="ep-title">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">{d.endpoints.caption}</caption>
            <thead className="bg-surface-2"><tr>{[d.endpoints.columns.method, d.endpoints.columns.path, d.endpoints.columns.purpose].map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {d.endpoints.rows.map((r) => (
                <tr key={r.path} className="border-t border-border">
                  <td className="px-4 py-3"><span className="m-badge font-mono">{r.method}</span></td>
                  <th scope="row" className="px-4 py-3 font-mono font-medium">{r.path}</th>
                  <td className="px-4 py-3 text-text-muted">{r.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <CtaBand title={d.cta.title} body={d.cta.body} primary={{ href: APP_ROUTES.signup, label: d.hero.primary }} />
    </>
  )
}
