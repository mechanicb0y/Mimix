import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { JsonLd } from '@/components/JsonLd'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { CtaBand } from '@/components/ui/CtaBand'
import { fmt, formatDate, getContent, getMessages } from '@/i18n'
import { readingMinutes } from '@/lib/blog'
import { articleLd, breadcrumbLd, buildMetadata } from '@/lib/seo'

export const dynamicParams = false
export function generateStaticParams() { return getContent().blog.posts.map((p) => ({ slug: p.slug })) }

export async function generateMetadata({ params }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params
  const post = getContent().blog.posts.find((p) => p.slug === slug)
  if (!post) return {}
  return buildMetadata({ title: post.title, description: post.description, path: `/blog/${slug}`, type: 'article', publishedTime: post.date })
}

export default async function BlogPostPage({ params }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params
  const { posts, blogIndex: b } = getContent().blog
  const post = posts.find((p) => p.slug === slug)
  if (!post) notFound()
  const m = getMessages()
  const path = `/blog/${slug}`
  const crumbs = [{ name: m.common.breadcrumbHome, path: '/' }, { name: b.hero.overline, path: '/blog' }, { name: post.title, path }]
  const headings = post.body.filter((x) => x.type === 'h2')
  const related = posts.filter((p) => p.slug !== slug).slice(0, 2)
  return (
    <>
      <JsonLd nodes={[articleLd({ title: post.title, description: post.description, path, date: post.date, author: post.author }), breadcrumbLd(crumbs)]} />
      <article aria-labelledby="post-title" className="pt-10 pb-8 md:pt-16">
        <div className="container-content">
          <Breadcrumbs items={crumbs} />
          <header className="max-w-[760px]">
            <p className="eyebrow">{b.categories[post.category]}</p>
            <h1 id="post-title" className="mt-4 text-4xl font-bold md:text-5xl">{post.title}</h1>
            <p className="lead mt-4">{post.description}</p>
            <p className="mt-6 text-sm text-text-subtle">{fmt(b.byline, { author: post.author })} · <time dateTime={post.date}>{fmt(b.published, { date: formatDate(post.date) })}</time> · {fmt(b.minutes, { count: readingMinutes(post) })}</p>
          </header>
          <div role="img" aria-label={post.imageAlt} className="mt-10 h-48 rounded-[24px] md:h-72" style={{ background: 'var(--gradient-brand)', opacity: 0.85 }} />
          <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="prose-mimix">
              {post.body.map((blk, i) => {
                switch (blk.type) {
                  case 'p': return <p key={i}>{blk.text}</p>
                  case 'h2': return <h2 key={i} id={blk.id}>{blk.text}</h2>
                  case 'ul': return <ul key={i}>{blk.items.map((it) => <li key={it}>{it}</li>)}</ul>
                  case 'quote': return <blockquote key={i}><p>{blk.text}</p></blockquote>
                }
              })}
            </div>
            {headings.length > 0 && (
              <nav aria-labelledby="toc-title" className="hidden lg:block">
                <div className="sticky top-[calc(var(--header-h)+24px)]">
                  <h2 id="toc-title" className="eyebrow text-text-muted">{b.toc}</h2>
                  <ul className="mt-3 space-y-2 border-l border-border text-sm">
                    {headings.map((hd) => hd.type === 'h2' && <li key={hd.id}><a href={`#${hd.id}`} className="-ml-px flex min-h-6 items-center border-l-2 border-transparent pl-3 text-text-muted no-underline hover:border-primary hover:text-text">{hd.text}</a></li>)}
                  </ul>
                </div>
              </nav>
            )}
          </div>
          <Link href="/blog" className="m-btn ghost mt-12"><ArrowLeft strokeWidth={1.75} aria-hidden="true" />{b.backToBlog}</Link>
        </div>
      </article>
      {related.length > 0 && (
        <section aria-labelledby="related-title" className="py-12">
          <div className="container-content">
            <h2 id="related-title" className="text-2xl font-semibold">{b.related}</h2>
            <ul className="mt-6 grid gap-6 md:grid-cols-2">
              {related.map((p) => <li key={p.slug}><Link href={`/blog/${p.slug}`} className="m-card"><h3 className="font-display text-lg font-semibold">{p.title}</h3><p className="mt-2 text-sm text-text-muted">{p.description}</p></Link></li>)}
            </ul>
          </div>
        </section>
      )}
      <CtaBand title={m.home.cta.title} body={m.home.cta.body} />
    </>
  )
}
