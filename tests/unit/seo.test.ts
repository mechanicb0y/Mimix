import { describe, expect, it } from 'vitest'
import { getContent, getMessages, fmt } from '@/i18n'
import { DESCRIPTION_MAX, TITLE_MAX, buildMetadata, jsonLdString } from '@/lib/seo'

type Seo = { title: string; description: string }

function collectSeo(node: unknown, path: string, out: Array<[string, Seo]>) {
  if (!node || typeof node !== 'object') return
  for (const [k, v] of Object.entries(node)) {
    if (k === 'seo' && v && typeof v === 'object' && 'title' in v && 'description' in v) out.push([`${path}.seo`, v as Seo])
    else collectSeo(v, `${path}.${k}`, out)
  }
}

const entries: Array<[string, Seo]> = []
collectSeo(getMessages(), 'messages', entries)
const { blog, legal } = getContent()
for (const p of blog.posts) entries.push([`blog.${p.slug}`, { title: p.title, description: p.description }])
collectSeo(legal, 'legal', entries)
collectSeo(blog, 'blog', entries)

describe('page SEO copy', () => {
  it('covers every page type', () => {
    expect(entries.length).toBeGreaterThanOrEqual(30)
  })
  it.each(entries)('%s fits the title and description limits', (_, seo) => {
    expect(seo.title.length).toBeGreaterThan(0)
    expect(seo.title.length).toBeLessThanOrEqual(TITLE_MAX)
    expect(seo.description.length).toBeGreaterThanOrEqual(50)
    expect(seo.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    expect(seo.title).not.toMatch(/\{\w+\}/)
  })
  it('has no duplicate titles', () => {
    const titles = entries.map(([, s]) => s.title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})

describe('buildMetadata', () => {
  it('sets canonical, Open Graph and Twitter from one input', () => {
    const m = buildMetadata({ title: 'T', description: 'D', path: '/pricing' })
    expect(m.alternates?.canonical).toMatch(/\/pricing$/)
    expect(m.openGraph?.url).toBe(m.alternates?.canonical)
    expect(m.twitter).toMatchObject({ card: 'summary_large_image', title: 'T' })
  })
})

describe('jsonLdString', () => {
  it('escapes "<" so a string cannot close the script tag', () => {
    expect(jsonLdString([{ name: '</script><b>' }])).not.toContain('</script>')
  })
})

describe('fmt', () => {
  it('fills known placeholders and keeps unknown ones visible', () => {
    expect(fmt('{a} and {b}', { a: 1 })).toBe('1 and {b}')
  })
})
