import type { Metadata, Viewport } from 'next'
import { Figtree, JetBrains_Mono, Sora } from 'next/font/google'
import { themeInitScript } from '@/components/site/ThemeToggle'
import { ServiceWorker } from '@/components/site/ServiceWorker'
import { siteUrl } from '@/config/site'
import { getMessages } from '@/i18n'
import { siteDescription } from '@/server/site-features'
import './globals.css'

const sora = Sora({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-sora', display: 'swap' })
const figtree = Figtree({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-figtree', display: 'swap' })
// Monospace only appears in code samples, below the fold: not preloaded, so it never competes with the first paint.
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains', display: 'swap', preload: false })

const m = getMessages().common

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: m.meta.defaultTitle, template: m.meta.titleTemplate },
  description: siteDescription(),
  applicationName: m.meta.siteName,
  icons: {
    icon: [{ url: '/icons/favicon.svg', type: 'image/svg+xml' }, { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#04222B' }, { media: '(prefers-color-scheme: light)', color: '#FFFFFF' }],
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" data-theme="dark" className={`${sora.variable} ${figtree.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">{m.a11y.skipToContent}</a>
        {children}
        <ServiceWorker />
      </body>
    </html>
  )
}
