'use client'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { contactSalesSchema, fieldErrors, TEAM_SIZES } from '@/lib/validation'

type Field = 'name' | 'email' | 'company' | 'size' | 'useCase' | 'volume' | 'consent'
export interface ContactLabels {
  title: string; name: string; email: string; company: string; size: string; sizeOptions: Record<string, string>; sizePlaceholder: string
  useCase: string; useCasePlaceholder: string; volume: string; volumePlaceholder: string; consent: string; submit: string; submitting: string
  required: string; optional: string; success: { title: string; body: string }
  errors: Record<'name' | 'emailRequired' | 'emailInvalid' | 'company' | 'size' | 'useCase' | 'consent' | 'server' | 'rateLimited' | 'summary' | 'summaryOne', string>
}

const ORDER: Field[] = ['name', 'email', 'company', 'size', 'useCase', 'volume', 'consent']

/** Validates on blur and on submit. On submit errors, an error summary takes focus and links to each field. */
export function ContactSalesForm({ labels, supportEmail }: { labels: ContactLabels; supportEmail: string }) {
  const id = useId()
  const summaryRef = useRef<HTMLDivElement>(null)
  const [values, setValues] = useState({ name: '', email: '', company: '', size: '', useCase: '', volume: '', consent: false, website: '' })
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [showSummary, setShowSummary] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [serverError, setServerError] = useState('')
  const [sentTo, setSentTo] = useState('')

  const message = (code: string) => (labels.errors as Record<string, string>)[code] ?? code
  const validate = (v = values) => {
    const r = contactSalesSchema.safeParse(v)
    if (r.success) return {}
    const fe = fieldErrors(r.error)
    const out: Partial<Record<Field, string>> = {}
    for (const f of ORDER) if (fe[f]) out[f] = message(fe[f] as string)
    return out
  }
  const blur = (f: Field) => { const all = validate(); setErrors((e) => ({ ...e, [f]: all[f] })) }
  const set = <K extends keyof typeof values>(k: K, v: (typeof values)[K]) => {
    const next = { ...values, [k]: v }
    setValues(next)
    if (errors[k as Field]) setErrors((e) => ({ ...e, [k]: validate(next)[k as Field] }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const all = validate()
    setErrors(all)
    if (Object.keys(all).length) { setShowSummary(true); requestAnimationFrame(() => summaryRef.current?.focus()); return }
    setShowSummary(false); setStatus('submitting'); setServerError('')
    try {
      const res = await fetch('/api/contact-sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      if (res.ok) { setSentTo(values.email); setStatus('success'); return }
      if (res.status === 422) {
        const body = (await res.json()) as { fields?: Record<string, string> }
        const fe: Partial<Record<Field, string>> = {}
        for (const [k, code] of Object.entries(body.fields ?? {})) fe[k as Field] = message(code)
        setErrors(fe); setShowSummary(true); setStatus('idle'); requestAnimationFrame(() => summaryRef.current?.focus()); return
      }
      setServerError(res.status === 429 ? labels.errors.rateLimited : labels.errors.server.replace('{email}', supportEmail)); setStatus('error')
    } catch { setServerError(labels.errors.server.replace('{email}', supportEmail)); setStatus('error') }
  }

  if (status === 'success') {
    return (
      <div className="m-card text-center" role="status" aria-live="polite">
        <CircleCheck size={40} strokeWidth={1.75} aria-hidden="true" className="mx-auto text-success" />
        <h2 className="mt-4 font-display text-2xl font-semibold">{labels.success.title}</h2>
        <p className="mt-2 text-text-muted">{labels.success.body.replace('{email}', sentTo)}</p>
      </div>
    )
  }

  const errorList = ORDER.filter((f) => errors[f])
  const fid = (f: Field) => `${id}-${f}`
  const described = (f: Field, hint?: boolean) => [errors[f] ? `${fid(f)}-err` : null, hint ? `${fid(f)}-hint` : null].filter(Boolean).join(' ') || undefined
  const err = (f: Field) => errors[f] && <p id={`${fid(f)}-err`} className="m-error"><CircleAlert strokeWidth={1.75} aria-hidden="true" />{errors[f]}</p>
  const req = <span className="font-normal text-text-subtle"> ({labels.required})</span>

  return (
    <form onSubmit={onSubmit} noValidate className="m-card space-y-5 p-6 sm:p-8" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="font-display text-xl font-semibold">{labels.title}</h2>
      {showSummary && errorList.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-[10px] border border-danger p-4">
          <p className="font-semibold text-danger">{errorList.length === 1 ? labels.errors.summaryOne : labels.errors.summary.replace('{count}', String(errorList.length))}</p>
          <ul className="mt-2 list-disc pl-5 text-sm">{errorList.map((f) => <li key={f}><a href={`#${fid(f)}`} className="link">{errors[f]}</a></li>)}</ul>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={fid('name')} className="m-label">{labels.name}{req}</label>
          <input id={fid('name')} className="m-input" autoComplete="name" value={values.name} onChange={(e) => set('name', e.target.value)} onBlur={() => blur('name')} aria-invalid={errors.name ? true : undefined} aria-describedby={described('name')} required />
          {err('name')}
        </div>
        <div>
          <label htmlFor={fid('email')} className="m-label">{labels.email}{req}</label>
          <input id={fid('email')} type="email" inputMode="email" className="m-input" autoComplete="email" value={values.email} onChange={(e) => set('email', e.target.value)} onBlur={() => blur('email')} aria-invalid={errors.email ? true : undefined} aria-describedby={described('email')} required />
          {err('email')}
        </div>
        <div>
          <label htmlFor={fid('company')} className="m-label">{labels.company}{req}</label>
          <input id={fid('company')} className="m-input" autoComplete="organization" value={values.company} onChange={(e) => set('company', e.target.value)} onBlur={() => blur('company')} aria-invalid={errors.company ? true : undefined} aria-describedby={described('company')} required />
          {err('company')}
        </div>
        <div>
          <label htmlFor={fid('size')} className="m-label">{labels.size}{req}</label>
          <select id={fid('size')} className="m-select" value={values.size} onChange={(e) => set('size', e.target.value)} onBlur={() => blur('size')} aria-invalid={errors.size ? true : undefined} aria-describedby={described('size')} required>
            <option value="">{labels.sizePlaceholder}</option>
            {TEAM_SIZES.map((s) => <option key={s} value={s}>{labels.sizeOptions[s]}</option>)}
          </select>
          {err('size')}
        </div>
      </div>
      <div>
        <label htmlFor={fid('useCase')} className="m-label">{labels.useCase}{req}</label>
        <textarea id={fid('useCase')} className="m-textarea" rows={4} placeholder={labels.useCasePlaceholder} value={values.useCase} onChange={(e) => set('useCase', e.target.value)} onBlur={() => blur('useCase')} aria-invalid={errors.useCase ? true : undefined} aria-describedby={described('useCase')} required />
        {err('useCase')}
      </div>
      <div>
        <label htmlFor={fid('volume')} className="m-label">{labels.volume}</label>
        <input id={fid('volume')} className="m-input" placeholder={labels.volumePlaceholder} value={values.volume} onChange={(e) => set('volume', e.target.value)} />
      </div>
      <div className="hidden" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set('website', e.target.value)} />
      </div>
      <div>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
          <input id={fid('consent')} type="checkbox" className="mt-0.5 h-5 w-5 flex-none accent-[var(--primary)]" checked={values.consent} onChange={(e) => set('consent', e.target.checked)} aria-invalid={errors.consent ? true : undefined} aria-describedby={described('consent')} required />
          <span className="text-sm">{labels.consent}</span>
        </label>
        {err('consent')}
      </div>
      <button type="submit" className="m-btn primary lg w-full sm:w-auto" aria-busy={status === 'submitting'} disabled={status === 'submitting'}>
        {status === 'submitting' ? <><Spinner label={labels.submitting} /><span aria-hidden="true">{labels.submitting}</span></> : labels.submit}
      </button>
      <div role="status" aria-live="polite">{status === 'error' && <p className="m-error"><CircleAlert strokeWidth={1.75} aria-hidden="true" />{serverError}</p>}</div>
    </form>
  )
}
