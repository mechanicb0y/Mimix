import type { Metadata } from 'next'
import { absoluteUrl, SITE_NAME } from '@/config/site'
import { getMessages } from '@/i18n'

export const TITLE_MAX = 60
export const DESCRIPTION_MAX = 155
export const OG_IMAGE = { url: '/og/mimix-og.png', width: 1200, height: 630 }

interface PageSeo {
  title: string
  description: string
  path: string
  type?: 'website' | 'article'
  publishedTime?: string
  noindex?: boolean
}

/** Builds page metadata: exact title, description, canonical URL, Open Graph and Twitter tags. */
export function buildMetadata({ title, description, path, type = 'website', publishedTime, noindex }: PageSeo): Metadata {
  const m = getMessages()
  const url = absoluteUrl(path)
  const images = [{ ...OG_IMAGE, url: absoluteUrl(OG_IMAGE.url), alt: m.common.meta.ogImageAlt }]
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, type, locale: 'en_US', images, ...(publishedTime ? { publishedTime } : {}) },
    twitter: { card: 'summary_large_image', title, description, images: images.map((i) => i.url) },
    robots: noindex ? { index: false, follow: true } : undefined,
  }
}

type Json = Record<string, unknown>

export function organizationLd(): Json {
  return {
    '@type': 'Organization',
    '@id': absoluteUrl('/#organization'),
    name: SITE_NAME,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/icons/icon-512.png'),
  }
}

export function websiteLd(): Json {
  return { '@type': 'WebSite', '@id': absoluteUrl('/#website'), name: SITE_NAME, url: absoluteUrl('/'), publisher: { '@id': absoluteUrl('/#organization') }, inLanguage: 'en' }
}

export function webPageLd(title: string, description: string, path: string): Json {
  return { '@type': 'WebPage', '@id': absoluteUrl(`${path}#webpage`), url: absoluteUrl(path), name: title, description, isPartOf: { '@id': absoluteUrl('/#website') }, inLanguage: 'en' }
}

export function breadcrumbLd(items: Array<{ name: string; path: string }>): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  }
}

export function faqLd(faq: Array<{ q: string; a: string }>): Json {
  return { '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }
}

export function softwareLd(name: string, description: string, path: string, offers?: Array<{ name: string; price: number; currency: string }>): Json {
  return {
    '@type': 'SoftwareApplication',
    name,
    description,
    url: absoluteUrl(path),
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    publisher: { '@id': absoluteUrl('/#organization') },
    ...(offers ? { offers: offers.map((o) => ({ '@type': 'Offer', name: o.name, price: o.price.toFixed(2), priceCurrency: o.currency })) } : {}),
  }
}

export function articleLd(p: { title: string; description: string; path: string; date: string; author: string }): Json {
  return {
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    datePublished: p.date,
    dateModified: p.date,
    author: { '@type': 'Organization', name: p.author },
    publisher: { '@id': absoluteUrl('/#organization') },
    mainEntityOfPage: absoluteUrl(p.path),
    image: absoluteUrl(OG_IMAGE.url),
  }
}

/** Serialises a JSON-LD graph safely for a <script> tag (escapes "<" to prevent injection). */
export function jsonLdString(nodes: Json[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c')
}
