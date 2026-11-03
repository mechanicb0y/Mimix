/**
 * Error monitoring (Sentry). Off unless SENTRY_DSN is set, so local runs and tests send nothing.
 * Server and edge errors, including errors thrown while rendering, reach Sentry through
 * onRequestError. Personal data stays out: no request bodies, cookies or IP addresses.
 */
export async function register() {
  // Jobs left unfinished when the web process stopped (QUEUE_DRIVER=inline) start again.
  if (process.env.NEXT_RUNTIME === 'nodejs' && (process.env.QUEUE_DRIVER ?? 'inline') === 'inline' && !process.env.VITEST) {
    const { resumeInlineJobs } = await import('@/server/jobs')
    setTimeout(() => { resumeInlineJobs().then((n) => { if (n) console.log(`[jobs] picked up ${n} unfinished job(s)`) }, (e) => console.error('[jobs] could not pick up unfinished jobs', e)) }, 1500)
  }
  if (!process.env.SENTRY_DSN) return
  const Sentry = await import('@sentry/nextjs')
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? 'production',
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.05'),
    // No personal data: no user fields, cookies, headers, bodies (scripts, voices) or query values.
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, databaseQueryData: false },
  })
}

export async function onRequestError(...args: Parameters<typeof import('@sentry/nextjs').captureRequestError>) {
  if (!process.env.SENTRY_DSN) return
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureRequestError(...args)
}
