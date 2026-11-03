import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TriangleAlert } from 'lucide-react'
import { JsonLd } from '@/components/JsonLd'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { LEGAL_SLUGS, type LegalSlug } from '@/config/products'
import { SUPPORT_EMAIL } from '@/config/site'
import { COMPANY, COMPANY_DETAILS_PENDING } from '@/config/company'
import { fmt, formatDate, getContent, getMessages } from '@/i18n'
import { breadcrumbLd, buildMetadata, webPageLd } from '@/lib/seo'

export const dynamicParams = false
export function generateStaticParams() { return LEGAL_SLUGS.map((slug) => ({ slug })) }
const isSlug = (s: string): s is LegalSlug => (LEGAL_SLUGS as readonly string[]).includes(s)

export async function generateMetadata({ params }: PageProps<'/legal/[slug]'>) {
  const { slug } = await params
  if (!isSlug(slug)) return {}
  const doc = getContent().legal.legal[slug]
  return buildMetadata({ title: doc.seo.title, description: doc.seo.description, path: `/legal/${slug}` })
}

export default async function LegalPage({ params }: PageProps<'/legal/[slug]'>) {
  const { slug } = await params
  if (!isSlug(slug)) notFound()
  const { legal, legalUi, LEGAL_REVIEWED } = getContent().legal
  const doc = legal[slug]
  const fill = (t: string) => fmt(t, COMPANY)
  const m = getMessages()
  const path = `/legal/${slug}`
  const crumbs = [{ name: m.common.breadcrumbHome, path: '/' }, { name: doc.title, path }]
  return (
    <>
      <JsonLd nodes={[webPageLd(doc.seo.title, doc.seo.description, path), breadcrumbLd(crumbs)]} />
      <article aria-labelledby="doc-title" className="pt-10 pb-16 md:pt-16">
        <div className="container-content">
          <Breadcrumbs items={crumbs} />
          <h1 id="doc-title" className="text-4xl font-bold md:text-5xl">{doc.title}</h1>
          <p className="mt-4 text-sm text-text-subtle">{fmt(legalUi.updated, { date: formatDate(doc.updated) })}</p>
          {!LEGAL_REVIEWED && <p className="mt-6 flex max-w-[70ch] gap-3 rounded-[10px] border border-warning p-4 text-sm"><TriangleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 flex-none text-warning" />{legalUi.draftNotice}{COMPANY_DETAILS_PENDING && ` ${legalUi.placeholdersNotice}`}</p>}
          <div className="mt-10 grid gap-12 lg:grid-cols-[240px_minmax(0,1fr)]">
            <nav aria-labelledby="toc-title" className="lg:order-none">
              <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)]">
                <h2 id="toc-title" className="eyebrow text-text-muted">{legalUi.contents}</h2>
                <ol className="mt-3 space-y-2 text-sm">{doc.sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="tap text-text-muted no-underline hover:text-text">{s.heading}</a></li>)}</ol>
                <h2 className="eyebrow mt-8 text-text-muted">{legalUi.otherPolicies}</h2>
                <ul className="mt-3 space-y-2 text-sm">{LEGAL_SLUGS.filter((s) => s !== slug).map((s) => <li key={s}><Link href={`/legal/${s}`} className="tap text-text-muted no-underline hover:text-text">{legal[s].title}</Link></li>)}</ul>
              </div>
            </nav>
            <div className="prose-mimix">
              <p className="lead">{fill(doc.intro)}</p>
              {doc.sections.map((s) => (
                <section key={s.id} aria-labelledby={s.id}>
                  <h2 id={s.id}>{s.heading}</h2>
                  {s.paragraphs.map((p) => <p key={p}>{fill(p)}</p>)}
                  {s.list && <ul>{s.list.map((li) => <li key={li}>{fill(li)}</li>)}</ul>}
                </section>
              ))}
              <p className="mt-12">{fmt(legalUi.questions, { email: SUPPORT_EMAIL })}</p>
            </div>
          </div>
        </div>
      </article>
    </>
  )
}
