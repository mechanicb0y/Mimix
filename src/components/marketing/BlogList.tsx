'use client'
import Link from 'next/link'
import { ToggleGroup } from 'radix-ui'
import { useState } from 'react'

export interface PostCard { slug: string; category: string; categoryLabel: string; title: string; description: string; date: string; dateLabel: string; minutes: string; readMore: string }

export function BlogList({ posts, categories, labels }: { posts: PostCard[]; categories: Array<{ id: string; label: string }>; labels: { filter: string; all: string; empty: string } }) {
  const [cat, setCat] = useState('all')
  const shown = cat === 'all' ? posts : posts.filter((p) => p.category === cat)
  return (
    <div>
      <ToggleGroup.Root type="single" value={cat} onValueChange={(v) => v && setCat(v)} aria-label={labels.filter} className="seg flex-wrap">
        <ToggleGroup.Item value="all" className="seg-item">{labels.all}</ToggleGroup.Item>
        {categories.map((c) => <ToggleGroup.Item key={c.id} value={c.id} className="seg-item">{c.label}</ToggleGroup.Item>)}
      </ToggleGroup.Root>
      {shown.length === 0 ? <p className="mt-10 text-text-muted">{labels.empty}</p> : (
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <li key={p.slug}>
              <article className="m-card relative flex h-full flex-col">
                <div aria-hidden="true" className="mb-5 h-36 rounded-[10px]" style={{ background: 'var(--gradient-brand)', opacity: 0.85 }} />
                <p className="text-sm text-text-subtle"><span className="font-semibold text-primary-text">{p.categoryLabel}</span> · <time dateTime={p.date}>{p.dateLabel}</time> · {p.minutes}</p>
                <h2 className="mt-2 font-display text-xl font-semibold">
                  <Link href={`/blog/${p.slug}`} className="no-underline after:absolute after:inset-0 after:content-['']" aria-label={p.readMore}>{p.title}</Link>
                </h2>
                <p className="mt-2 text-sm text-text-muted">{p.description}</p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
