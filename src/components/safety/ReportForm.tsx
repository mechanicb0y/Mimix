'use client'
import { CircleCheck } from 'lucide-react'
import { useId, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages, fmt } from '@/i18n'
import { REPORT_DETAILS_MAX, REPORT_REASONS, type ReportReason } from '@/lib/schemas/safety'
import { Field, FormMessage, TextArea, TextInput } from '@/components/app/Field'

export function ReportForm({ initial, signedInEmail }: { initial: { type: 'voice' | 'generation'; id: string }; signedInEmail: string | null }) {
  const t = getMessages().safety.report.form
  const c = getMessages().app.common
  const id = useId()
  const [type, setType] = useState(initial.type)
  const [targetId, setTargetId] = useState(initial.id)
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<ApiClientError | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true); setErr(null)
    try {
      const r = await api<{ id: string }>('/api/reports', { method: 'POST', json: { targetType: type, targetId: targetId.trim(), reason, details, email, website } })
      setDone(r.id)
    } catch (e) {
      setErr(e instanceof ApiClientError ? e : new ApiClientError(0, 'network', c.networkError))
    } finally { setBusy(false) }
  }

  if (done) {
    return (
      <div className="m-card grid gap-3 p-6 sm:p-8" role="status">
        <CircleCheck aria-hidden="true" className="text-[var(--success)]" />
        <h2 className="text-[22px] font-semibold">{t.success.title}</h2>
        <p className="text-[var(--text-muted)]">{fmt(t.success.body, { reference: done })}</p>
        <div><button type="button" className="m-btn secondary" onClick={() => { setDone(null); setTargetId(''); setReason(''); setDetails('') }}>{t.another}</button></div>
      </div>
    )
  }
  const f = err?.fields ?? {}
  return (
    <form className="m-card grid gap-4 p-6 sm:p-8" noValidate onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <fieldset className="grid gap-2">
        <legend className="m-label">{t.targetType}</legend>
        <div className="flex flex-wrap gap-4">
          {(['voice', 'generation'] as const).map((k) => (
            <label key={k} className="flex min-h-11 items-center gap-2"><input type="radio" name={`${id}-type`} className="size-4 accent-[var(--primary)]" checked={type === k} onChange={() => setType(k)} />{t.types[k]}</label>
          ))}
        </div>
      </fieldset>
      <TextInput label={t.targetId} hint={t.targetIdHint} value={targetId} onChange={(e) => setTargetId(e.target.value)} error={f.targetId} spellCheck={false} autoComplete="off" />
      <Field label={t.reason} error={f.reason}>
        {(p) => (
          <select className="m-select" value={reason} onChange={(e) => setReason(e.target.value as ReportReason)} {...p}>
            <option value="" disabled>{'—'}</option>
            {REPORT_REASONS.map((r) => <option key={r} value={r}>{t.reasons[r]}</option>)}
          </select>
        )}
      </Field>
      <TextArea label={<>{t.details} <span className="font-normal text-[var(--text-subtle)]">({c.optional})</span></>} hint={t.detailsHint} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={REPORT_DETAILS_MAX} rows={5} error={f.details} />
      {signedInEmail ? <p className="text-[14px] text-[var(--text-muted)]">{fmt(t.signedInEmail, { email: signedInEmail })}</p> : (
        <TextInput label={<>{t.email} <span className="font-normal text-[var(--text-subtle)]">({c.optional})</span></>} hint={t.emailHint} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={f.email} />
      )}
      <div className="sr-only" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label></div>
      {err && !Object.keys(err.fields).length ? <FormMessage>{err.message}</FormMessage> : null}
      <div><button type="submit" className="m-btn primary lg" aria-busy={busy} disabled={busy}>{busy ? t.submitting : t.submit}</button></div>
    </form>
  )
}
