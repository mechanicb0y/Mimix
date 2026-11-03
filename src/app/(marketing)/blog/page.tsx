import { JsonLd } from '@/components/JsonLd'
import { BlogList } from '@/components/marketing/BlogList'
import { fmt, formatDate, getContent } from '@/i18n'
import { readingMinutes } from '@/lib/blog'
import { absoluteUrl } from '@/config/site'
import { buildMetadata, webPageLd } from '@/lib/seo'

const { blogIndex: b, posts } = getContent().blog
const path = '/blog'
export const metadata = buildMetadata({ title: b.seo.title, description: b.seo.description, path })

export default function BlogIndexPage() {
  const sorted = [...posts].sort((x, y) => y.date.localeCompare(x.date))
  return (
    <>
      <JsonLd nodes={[{ ...webPageLd(b.seo.title, b.seo.description, path), '@type': 'Blog', blogPost: sorted.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: absoluteUrl(`/blog/${p.slug}`), datePublished: p.date })) }]} />
      <section aria-labelledby="hero-title" className="pt-12 pb-16 md:pt-20">
        <div className="container-content">
          <div className="max-w-[720px]">
            <p className="eyebrow">{b.hero.overline}</p>
            <h1 id="hero-title" className="mt-4 text-5xl font-bold">{b.hero.title}</h1>
            <p className="lead mt-6">{b.hero.lead}</p>
          </div>
          <div className="mt-12">
            <BlogList
              labels={{ filter: b.filterLabel, all: b.all, empty: b.empty }}
              categories={Object.entries(b.categories).map(([id, label]) => ({ id, label }))}
              posts={sorted.map((p) => ({ slug: p.slug, category: p.category, categoryLabel: b.categories[p.category], title: p.title, description: p.description, date: p.date, dateLabel: formatDate(p.date), minutes: fmt(b.minutes, { count: readingMinutes(p) }), readMore: fmt(b.readMore, { title: p.title }) }))}
            />
          </div>
        </div>
      </section>
    </>
  )
}
