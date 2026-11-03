'use client'
import { errors } from '@/i18n/messages/en/errors'
import { useEffect } from 'react'
import './globals.css'

/** Last-resort 500 when the root layout itself fails. Must render its own html and body. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const e = errors.server
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) void import('@sentry/nextjs').then((S) => S.captureException(error))
  }, [error])
  return (
    <html lang="en" data-theme="dark">
      <body>
        <main id="main" className="grid min-h-dvh place-items-center px-4 text-center">
          <div>
            <p className="gradient-text font-display text-[96px] leading-none font-bold" aria-hidden="true">{e.code}</p>
            <h1 className="mt-6 text-4xl font-bold">{e.title}</h1>
            <p className="lead mx-auto mt-4 max-w-[560px]">{e.body}</p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={() => retry()} className="m-btn primary lg">{e.retry}</button>
              {/* A plain anchor: client navigation may be what failed. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="m-btn secondary lg">{e.home}</a>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
