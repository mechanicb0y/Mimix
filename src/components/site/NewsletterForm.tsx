'use client'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { emailProblem } from '@/lib/email'

export interface NewsletterLabels {
  label: string; placeholder: string; submit: string; submitting: string; success: string
  errors: { required: string; invalid: string; server: string; rateLimited: string }
}

type State = { status: 'idle' | 'submitting' | 'success' } | { status: 'error'; message: string }

/** Inline validation on blur and submit; success and error states announced politely. */
export function NewsletterForm({ labels }: { labels: NewsletterLabels }) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [state, setState] = useState<State>({ status: 'idle' })

  const validate = (value: string): string | null => {
    const problem = emailProblem(value)
    return problem === null ? null : problem === 'required' ? labels.errors.required : labels.errors.invalid
  }
  const fieldError = touched ? validate(email) : null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (validate(email)) { inputRef.current?.focus(); return }
    setState({ status: 'submitting' })
    try {
      const res = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      if (res.ok) { setState({ status: 'success' }); setEmail(''); setTouched(false); return }
      setState({ status: 'error', message: res.status === 429 ? labels.errors.rateLimited : res.status === 422 ? labels.errors.invalid : labels.errors.server })
    } catch {
      setState({ status: 'error', message: labels.errors.server })
    }
  }

  const describedBy = [fieldError ? `${id}-err` : null, state.status === 'error' ? `${id}-status` : null].filter(Boolean).join(' ') || undefined

  return (
    <form onSubmit={onSubmit} noValidate className="w-full" aria-busy={state.status === 'submitting'}>
      <label htmlFor={`${id}-email`} className="m-label">{labels.label}</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef} id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="email"
          className="m-input" placeholder={labels.placeholder} value={email}
          onChange={(e) => { setEmail(e.target.value); if (state.status !== 'submitting') setState({ status: 'idle' }) }}
          onBlur={() => email && setTouched(true)}
          aria-invalid={fieldError ? true : undefined} aria-describedby={describedBy}
        />
        <button type="submit" className="m-btn primary flex-none" aria-busy={state.status === 'submitting'} disabled={state.status === 'submitting'}>
          {state.status === 'submitting' ? <Spinner label={labels.submitting} /> : labels.submit}
        </button>
      </div>
      {fieldError && <p id={`${id}-err`} className="m-error"><CircleAlert strokeWidth={1.75} aria-hidden="true" />{fieldError}</p>}
      <div role="status" aria-live="polite" id={`${id}-status`}>
        {state.status === 'success' && <p className="mt-2 flex items-start gap-2 text-sm text-success"><CircleCheck size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 flex-none" />{labels.success}</p>}
        {state.status === 'error' && <p className="m-error"><CircleAlert strokeWidth={1.75} aria-hidden="true" />{state.message}</p>}
      </div>
    </form>
  )
}
