import Link from 'next/link'
import { JsonLd } from '@/components/JsonLd'
import { VoiceBrowser, type VoiceCardView } from '@/components/marketing/VoiceBrowser'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { CtaBand } from '@/components/ui/CtaBand'
import { Section } from '@/components/ui/Section'
import { playerLabels } from '@/components/ui/player-labels'
import { LIBRARY_VOICES } from '@/config/voices'
import { APP_ROUTES } from '@/config/site'
import { fmt, getMessages } from '@/i18n'
import { breadcrumbLd, buildMetadata, webPageLd } from '@/lib/seo'
import { sampleMeta } from '@/lib/voice/samples'

const m = getMessages()
const l = m.library
const path = '/voice-library'

export const metadata = buildMetadata({ title: l.seo.title, description: l.seo.description, path })

export default function VoiceLibraryPage() {
  const vals = l.values
  const voices: VoiceCardView[] = LIBRARY_VOICES.map((v) => ({
    id: v.id, name: v.name, language: v.language, accent: v.accent, gender: v.gender, age: v.age, useCase: v.useCase, licence: v.licence,
    labels: { language: vals.language[v.language], accent: vals.accent[v.accent as keyof typeof vals.accent], gender: vals.gender[v.gender], age: vals.age[v.age], useCase: vals.useCase[v.useCase], licence: vals.licence[v.licence] },
    sample: sampleMeta(`voice-${v.id}`),
  }))
  const crumbs = [{ name: m.common.breadcrumbHome, path: '/' }, { name: m.common.products['voice-library'].name, path }]
  return (
    <>
      <JsonLd nodes={[webPageLd(l.seo.title, l.seo.description, path), breadcrumbLd(crumbs)]} />
      <section aria-labelledby="hero-title" className="pt-10 pb-10 md:pt-16">
        <div className="container-content">
          <Breadcrumbs items={crumbs} />
          <div className="max-w-[760px]">
            <p className="eyebrow">{l.hero.overline}</p>
            <h1 id="hero-title" className="mt-4 text-5xl font-bold lg:text-6xl">{l.hero.title}</h1>
            <p className="lead mt-6">{l.hero.lead}</p>
            <p className="mt-4 text-sm text-text-subtle">{fmt(l.hero.count, { count: voices.length })}</p>
          </div>
        </div>
      </section>
      <section aria-label={l.filters.title} className="pb-16">
        <div className="container-content">
          <VoiceBrowser voices={voices} player={playerLabels()} labels={{ title: l.filters.title, search: l.filters.search, searchPlaceholder: l.filters.searchPlaceholder, any: l.filters.any, reset: l.filters.reset, results: l.filters.results, resultsOne: l.filters.resultsOne, filters: { language: l.filters.language, accent: l.filters.accent, gender: l.filters.gender, age: l.filters.age, useCase: l.filters.useCase }, empty: l.empty }} />
        </div>
      </section>
      <Section labelledBy="publish-title" tone="raised">
        <div className="max-w-[720px]">
          <h2 id="publish-title" className="text-3xl font-semibold md:text-4xl">{l.publish.title}</h2>
          <p className="lead mt-4">{l.publish.body}</p>
          <Link href="/legal/voice-cloning-policy" className="link mt-6 inline-block">{l.publish.cta}</Link>
        </div>
      </Section>
      <CtaBand title={l.cta.title} body={l.cta.body} primary={{ href: APP_ROUTES.signup, label: m.common.cta.startFree }} />
    </>
  )
}
