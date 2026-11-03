'use client'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'

/** Label + control + hint + error, wired with aria-describedby and aria-invalid. */
export function Field({ label, hint, error, children, id: given, className }: {
  label: ReactNode; hint?: ReactNode; error?: string | null; className?: string
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true }) => ReactNode; id?: string
}) {
  const auto = useId()
  const id = given ?? auto
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  const describedBy = [errId, hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="m-label">{label}</label>
      {children({ id, 'aria-describedby': describedBy, ...(error ? { 'aria-invalid': true as const } : {}) })}
      {error ? <p id={errId} className="m-error"><AlertCircle size={16} aria-hidden="true" className="mt-px flex-none" />{error}</p> : null}
      {hint ? <p id={hintId} className="m-hint">{hint}</p> : null}
    </div>
  )
}

export function TextInput({ label, hint, error, ...rest }: { label: ReactNode; hint?: ReactNode; error?: string | null } & InputHTMLAttributes<HTMLInputElement>) {
  return <Field label={label} hint={hint} error={error} id={rest.id}>{(p) => <input className="m-input" {...rest} {...p} />}</Field>
}

export function TextArea({ label, hint, error, ...rest }: { label: ReactNode; hint?: ReactNode; error?: string | null } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <Field label={label} hint={hint} error={error} id={rest.id}>{(p) => <textarea className="m-textarea" {...rest} {...p} />}</Field>
}

export function PasswordInput({ label, hint, error, showLabel, hideLabel, ...rest }: { label: ReactNode; hint?: ReactNode; error?: string | null; showLabel: string; hideLabel: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <Field label={label} hint={hint} error={error}>
      {(p) => (
        <div className="relative">
          <input className="m-input pr-12" type={show ? 'text' : 'password'} {...rest} {...p} />
          <button type="button" className="m-btn ghost icon sm absolute right-1 top-1/2 -translate-y-1/2" aria-label={show ? hideLabel : showLabel} aria-pressed={show} onClick={() => setShow((s) => !s)}>
            {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
      )}
    </Field>
  )
}

/** Form-level message. role=alert so screen readers announce it when it appears. */
export function FormMessage({ tone = 'error', children }: { tone?: 'error' | 'success' | 'info'; children: ReactNode }) {
  if (!children) return null
  const cls = tone === 'error' ? 'border-[var(--danger)] text-[var(--danger)]' : tone === 'success' ? 'border-[var(--success)] text-[var(--text)]' : 'border-[var(--border-strong)] text-[var(--text)]'
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-[var(--radius-md)] border bg-[var(--surface-2)] px-4 py-3 text-[14px] leading-5 ${cls}`}>{children}</div>
}
