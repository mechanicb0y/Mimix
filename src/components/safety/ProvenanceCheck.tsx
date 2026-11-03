'use client'
import Link from 'next/link'
import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { useState } from 'react'
import { ApiClientError } from '@/lib/api-client'
import { getMessages, fmt, formatDate } from '@/i18n'
import { PROVENANCE_MAX_BYTES } from '@/lib/schemas/safety'
import { Field, FormMessage } from '@/components/app/Field'

interface Result { verdict: 'exact' | 'labelled' | 'none'; createdAt: string | null; reference: string | null }

export function ProvenanceCheck() {
  const t = getMessages().safety.check
  const e = getMessages().errors.app.safety
  const c = getMessages().app.common
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const check = async () => {
    setResult(null)
    if (!file) return setError(e.noFile)
    if (file.size > PROVENANCE_MAX_BYTES) return setError(e.tooLarge)
    setError(null); setBusy(true)
    try {
      const res = await fetch('/api/provenance', { method: 'POST', body: file, headers: { 'Content-Type': 'application/octet-stream' } })
      const body = await res.json()
      if (!res.ok) throw new ApiClientError(res.status, body?.error?.code ?? 'error', body?.error?.message ?? c.networkError)
      setResult(body as Result)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : c.networkError)
    } finally { setBusy(false) }
  }

  const r = result ? t.results[result.verdict] : null
  const Icon = result?.verdict === 'exact' ? ShieldCheck : result?.verdict === 'labelled' ? ShieldAlert : ShieldQuestion
  return (
    <div className="grid gap-4">
      <form className="m-card grid gap-4 p-6 sm:p-8" noValidate onSubmit={(ev) => { ev.preventDefault(); void check() }}>
        <Field label={t.file} hint={t.fileHint} error={error}>
          {(p) => <input type="file" accept="audio/*,video/mp4" className="m-input pt-2" onChange={(ev) => { setFile(ev.target.files?.[0] ?? null); setResult(null) }} {...p} />}
        </Field>
        <div><button type="submit" className="m-btn primary lg" aria-busy={busy} disabled={busy}>{busy ? t.checking : t.submit}</button></div>
      </form>
      <div aria-live="polite">
        {result && r ? (
          <section className="m-card grid gap-2 p-6" data-testid="provenance-result">
            <h2 className="flex items-center gap-2 text-[20px] font-semibold"><Icon aria-hidden="true" className={result.verdict === 'none' ? 'text-[var(--text-muted)]' : 'text-[var(--primary)]'} />{r.title}</h2>
            <p className="text-[var(--text-muted)]">{fmt(r.body, { date: result.createdAt ? formatDate(result.createdAt.slice(0, 10)) : '' })}</p>
            {result.reference ? (
              <p className="flex flex-wrap items-center gap-3 text-[14px]">
                <code>{fmt(t.reference, { reference: result.reference })}</code>
                <Link className="m-btn secondary sm" href={`/report?type=generation&id=${encodeURIComponent(result.reference)}`}>{t.report}</Link>
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
      <FormMessage tone="info">{t.limits}</FormMessage>
    </div>
  )
}
