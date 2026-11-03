import { Check, Minus } from 'lucide-react'
import { JsonLd } from '@/components/JsonLd'
import { PricingPlans, type PlanView } from '@/components/marketing/PricingPlans'
import { CtaBand } from '@/components/ui/CtaBand'
import { Faq } from '@/components/ui/Faq'
import { Section, SectionHeading } from '@/components/ui/Section'
import { ACTIVE_CURRENCIES, currentPlans, annualDiscountPercent, minutesOfSpeech, planHas, type Plan } from '@/config/plans'
import { APP_ROUTES } from '@/config/site'
import { fmt, formatNumber, getMessages, plural } from '@/i18n'
import { buildMetadata, faqLd, softwareLd, webPageLd } from '@/lib/seo'
import { productAvailability, soonLabel } from '@/server/site-features'
import { refreshPlans } from '@/server/plans'

const m = getMessages()
const pr = m.pricing
const path = '/pricing'
const currency = ACTIVE_CURRENCIES[0] ?? 'USD'

/** Plan edits from the admin console show up within a minute. */
export const revalidate = 60

export const metadata = buildMetadata({ title: pr.seo.title, description: pr.seo.description, path })

function features(p: Plan): string[] {
  const f = pr.features
  const on = productAvailability()
  if (p.id === 'enterprise') return f.enterpriseItems
  const out = [
    fmt(f.credits, { credits: formatNumber(p.creditsPerMonth ?? 0) }),
    fmt(f.minutes, { minutes: formatNumber(minutesOfSpeech(p.creditsPerMonth ?? 0)) }),
    plural(p.seats ?? 1, f.seats, f.seatsPlural),
    fmt(f.customVoices, { count: p.customVoices ?? 0 }),
    soonLabel(fmt(f.mixer, { count: p.mixerSources }), on['voice-mixer']),
    p.commercialUse ? f.commercial : f.personal,
  ]
  if (planHas(p, 'instantClone')) out.push(soonLabel(f.instantCloning, on['voice-cloning']))
  if (p.professionalClones > 0) out.push(soonLabel(plural(p.professionalClones, f.professionalClones, f.professionalClonesPlural), on['voice-cloning']))
  return out
}

export default async function PricingPage() {
  await refreshPlans()
  const PLANS = currentPlans()
  const views: PlanView[] = PLANS.map((p) => {
    const price = p.prices[currency]
    const copy = pr.plans[p.id]
    return { id: p.id, name: copy.name, blurb: copy.blurb, cta: copy.cta, href: p.id === 'enterprise' ? '/contact-sales' : `${APP_ROUTES.signup}?plan=${p.id}`, highlighted: !!p.highlighted, monthly: price?.monthly ?? null, annualPerMonth: price?.annualPerMonth ?? null, features: features(p) }
  })
  const offers = PLANS.flatMap((p) => { const pc = p.prices[currency]; return pc ? [{ name: pr.plans[p.id].name, price: pc.monthly / 100, currency }] : [] })
  const yes = <><Check size={18} strokeWidth={2} aria-hidden="true" className="inline text-accent" /><span className="sr-only">{pr.compare.yes}</span></>
  const no = <><Minus size={18} strokeWidth={1.75} aria-hidden="true" className="inline text-text-subtle" /><span className="sr-only">{pr.compare.no}</span></>
  const cell = (v: boolean | string | number) => (typeof v === 'boolean' ? (v ? yes : no) : v)
  const custom = pr.custom
  const rateKeys = ['tts', 'stt', 'dubbing', 'changer', 'isolator', 'sfx', 'design', 'mixer'] as const
  const on = productAvailability()
  const rateOn: Record<(typeof rateKeys)[number], boolean> = { tts: true, stt: on['speech-to-text'], dubbing: on.dubbing, changer: on['voice-changer'], isolator: on['voice-isolator'], sfx: on['sound-effects'], design: on['voice-design'], mixer: on['voice-mixer'] }
  const rows: Array<[string, (p: Plan) => boolean | string | number]> = [
    [pr.compare.rows.credits, (p) => (p.creditsPerMonth === null ? custom : formatNumber(p.creditsPerMonth))],
    [pr.compare.rows.seats, (p) => p.seats ?? custom],
    [pr.compare.rows.voices, (p) => p.customVoices ?? custom],
    [soonLabel(pr.compare.rows.instant, on['voice-cloning']), (p) => planHas(p, 'instantClone')],
    [soonLabel(pr.compare.rows.pro, on['voice-cloning']), (p) => (p.id === 'enterprise' ? custom : p.professionalClones || false)],
    [soonLabel(pr.compare.rows.mixer, on['voice-mixer']), (p) => p.mixerSources],
    [soonLabel(pr.compare.rows.dubbing, on.dubbing), (p) => planHas(p, 'dubbing')],
    [pr.compare.rows.studio, (p) => planHas(p, 'studio')],
    [pr.compare.rows.commercial, (p) => p.commercialUse],
    [pr.compare.rows.api, () => true],
  ]

  return (
    <>
      <JsonLd nodes={[webPageLd(pr.seo.title, pr.seo.description, path), softwareLd('Mimix', pr.seo.description, path, offers), faqLd(pr.faq)]} />
      <section aria-labelledby="hero-title" className="pt-12 pb-16 md:pt-20">
        <div className="container-content">
          <div className="mx-auto max-w-[720px] text-center">
            <p className="eyebrow">{pr.hero.overline}</p>
            <h1 id="hero-title" className="mt-4 text-5xl font-bold lg:text-6xl">{pr.hero.title}</h1>
            <p className="lead mt-6">{pr.hero.lead}</p>
          </div>
          <div className="mt-12">
            <PricingPlans plans={views} currency={currency} discountPct={annualDiscountPercent(currency)} labels={{ ...pr.toggle, plansHeading: pr.plansHeading, perMonth: pr.perMonth, billedAnnually: pr.billedAnnually, billedMonthly: pr.billedMonthly, free: pr.free, custom: pr.custom, popular: pr.popular }} />
          </div>
        </div>
      </section>

      <Section labelledBy="rates-title" tone="raised">
        <SectionHeading id="rates-title" title={pr.rates.title} lead={pr.rates.lead} />
        <div className="relative mt-10 overflow-x-auto rounded-[16px] border border-border" data-reveal tabIndex={0} role="region" aria-labelledby="rates-title">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">{pr.rates.caption}</caption>
            <thead className="bg-surface-2"><tr>{[pr.rates.columns.tool, pr.rates.columns.cost, pr.rates.columns.free].map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {rateKeys.map((k) => { const r = pr.rates.rows[k]; return (
                <tr key={k} className="border-t border-border"><th scope="row" className="px-4 py-3 font-semibold">{soonLabel(r.tool, rateOn[k])}</th><td className="px-4 py-3 text-text-muted">{r.cost}</td><td className="px-4 py-3 text-text-muted">{r.free}</td></tr>
              ) })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section labelledBy="compare-title">
        <SectionHeading id="compare-title" title={pr.compare.title} />
        <div className="relative mt-10 overflow-x-auto rounded-[16px] border border-border" data-reveal tabIndex={0} role="region" aria-labelledby="compare-title">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <caption className="sr-only">{pr.compare.caption}</caption>
            <thead className="bg-surface-2">
              <tr><th scope="col" className="sticky left-0 bg-surface-2 px-4 py-3 font-semibold">{pr.compare.feature}</th>{PLANS.map((p) => <th key={p.id} scope="col" className="px-4 py-3 text-center font-semibold">{pr.plans[p.id].name}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(([label, get]) => (
                <tr key={label} className="border-t border-border">
                  <th scope="row" className="sticky left-0 bg-bg px-4 py-3 font-semibold">{label}</th>
                  {PLANS.map((p) => <td key={p.id} className="px-4 py-3 text-center text-text-muted">{cell(get(p))}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="api" labelledBy="api-title" tone="raised">
        <SectionHeading id="api-title" title={pr.api.title} lead={pr.api.body} />
      </Section>

      <Section labelledBy="faq-title">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <SectionHeading id="faq-title" title={m.common.faqTitle} />
          <Faq items={pr.faq} />
        </div>
      </Section>
      <CtaBand title={pr.cta.title} body={pr.cta.body} secondary={{ href: '/contact-sales', label: m.common.cta.contactSales }} />
    </>
  )
}
