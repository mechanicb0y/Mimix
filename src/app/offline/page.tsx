import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'
import { getMessages } from '@/i18n'

const m = getMessages().errors.offline

/** Shown by the service worker (public/sw.js) when a page can't load without a connection. */
export const metadata: Metadata = { title: m.seoTitle, robots: { index: false, follow: false } }
export const dynamic = 'force-static'

export default function Offline() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-16">
      <section aria-labelledby="offline-title" className="grid max-w-[480px] justify-items-center gap-4 text-center">
        <WifiOff aria-hidden="true" size={40} className="text-[var(--text-muted)]" />
        <h1 id="offline-title" className="text-3xl font-bold">{m.title}</h1>
        <p className="text-[var(--text-muted)]">{m.body}</p>
        {/* A full page load on purpose: it is the retry, and it works without JavaScript or the router. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="m-btn primary">{m.retry}</a>
      </section>
    </main>
  )
}
