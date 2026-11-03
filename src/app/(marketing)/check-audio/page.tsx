import { ProvenanceCheck } from '@/components/safety/ProvenanceCheck'
import { getMessages } from '@/i18n'
import { buildMetadata } from '@/lib/seo'

const c = getMessages().safety.check
export const metadata = buildMetadata({ title: c.seo.title, description: c.seo.description, path: '/check-audio' })

export default function CheckAudioPage() {
  return (
    <section aria-labelledby="hero-title" className="pt-12 pb-16 md:pt-20">
      <div className="container-content grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <p className="eyebrow">{c.overline}</p>
          <h1 id="hero-title" className="mt-4 text-5xl font-bold">{c.title}</h1>
          <p className="lead mt-6">{c.lead}</p>
        </div>
        <ProvenanceCheck />
      </div>
    </section>
  )
}
