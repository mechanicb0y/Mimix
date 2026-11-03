import type { MetadataRoute } from 'next'
import { LEGAL_SLUGS, PRODUCT_SLUGS, USE_CASE_SLUGS } from '@/config/products'
import { absoluteUrl } from '@/config/site'
import { getContent } from '@/i18n'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const page = (path: string, priority: number, changeFrequency: 'weekly' | 'monthly' | 'yearly' = 'monthly', lastModified: Date = now) => ({ url: absoluteUrl(path), lastModified, changeFrequency, priority })
  return [
    page('/', 1, 'weekly'),
    page('/voice-mixer', 0.9),
    ...PRODUCT_SLUGS.map((s) => page(`/products/${s}`, 0.8)),
    page('/voice-library', 0.8, 'weekly'),
    page('/pricing', 0.9),
    page('/developers', 0.8),
    ...USE_CASE_SLUGS.map((s) => page(`/use-cases/${s}`, 0.7)),
    page('/about', 0.5),
    page('/blog', 0.6, 'weekly'),
    ...getContent().blog.posts.map((p) => page(`/blog/${p.slug}`, 0.6, 'yearly', new Date(`${p.date}T00:00:00Z`))),
    page('/contact-sales', 0.6),
    page('/help', 0.6),
    page('/sign-up', 0.5),
    page('/report', 0.3, 'yearly'),
    page('/check-audio', 0.4, 'yearly'),
    ...LEGAL_SLUGS.map((s) => page(`/legal/${s}`, 0.3, 'yearly')),
  ]
}
