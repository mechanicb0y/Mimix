import type { Metadata } from 'next'
import Link from 'next/link'
import { ErrorView, HomeLink } from '@/components/site/ErrorView'
import { SiteChrome } from '@/components/site/SiteChrome'
import { getMessages } from '@/i18n'

const m = getMessages()
// Next adds <meta name="robots" content="noindex"> to every 404 response itself.
export const metadata: Metadata = { title: m.errors.notFound.seoTitle }

export default function NotFound() {
  const e = m.errors.notFound
  const popular = [
    { href: '/products/text-to-speech', label: m.common.products['text-to-speech'].name },
    { href: '/voice-mixer', label: m.common.products['voice-mixer'].name },
    { href: '/voice-library', label: m.common.products['voice-library'].name },
    { href: '/pricing', label: m.common.nav.pricing },
    { href: '/help', label: m.common.nav.resourceItems.help.title },
  ]
  return (
    <SiteChrome>
      <ErrorView code={e.code} title={e.title} body={e.body}>
        <HomeLink label={e.home} />
        <h2 className="eyebrow mt-12 text-text-muted">{e.links}</h2>
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {popular.map((p) => <li key={p.href}><Link href={p.href} className="m-btn secondary sm">{p.label}</Link></li>)}
        </ul>
      </ErrorView>
    </SiteChrome>
  )
}
