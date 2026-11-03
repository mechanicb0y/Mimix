'use client'
import { useEffect } from 'react'
import { ErrorView, HomeLink } from '@/components/site/ErrorView'
import { errors } from '@/i18n/messages/en/errors'

/** 500 page inside the site chrome. Shows a reference so support can find the logged error. */
export default function MarketingError({ error, retry }: { error: unknown; retry: () => void }) {
  const e = errors.server
  const digest = typeof error === 'object' && error && 'digest' in error ? String((error as { digest?: string }).digest ?? '') : ''
  useEffect(() => { console.error(error) }, [error])
  return (
    <ErrorView code={e.code} title={e.title} body={e.body}>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" onClick={() => retry()} className="m-btn primary lg">{e.retry}</button>
        <HomeLink label={e.home} />
      </div>
      {digest && <p className="mt-8 font-mono text-xs text-text-subtle">{e.reference.replace('{id}', digest)}</p>}
    </ErrorView>
  )
}
