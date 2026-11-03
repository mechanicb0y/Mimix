/**
 * Browser error monitoring (Sentry). Loaded only when NEXT_PUBLIC_SENTRY_DSN is set at build time,
 * and only once the page is idle, so it never delays the first paint or the first interaction.
 * No session replay and no personal data.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn && typeof window !== 'undefined') {
  const start = () => {
    void import('@sentry/nextjs').then((Sentry) => {
      Sentry.init({
        dsn,
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? 'production',
        tracesSampleRate: 0,
        // No personal data: no user fields, cookies, headers, bodies (scripts, voices) or query values.
        dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, databaseQueryData: false },
      })
    })
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 5000 })
  else setTimeout(start, 3000)
}

export {}
