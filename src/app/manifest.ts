import type { MetadataRoute } from 'next'
import { getMessages } from '@/i18n'
import { siteDescription } from '@/server/site-features'

export default function manifest(): MetadataRoute.Manifest {
  const m = getMessages().common.meta
  return {
    name: m.siteName,
    short_name: m.siteName,
    description: siteDescription(),
    id: '/',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    categories: ['productivity', 'music', 'utilities'],
    background_color: '#04222B',
    theme_color: '#04222B',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
