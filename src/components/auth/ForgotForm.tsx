'use client'
import Link from 'next/link'
import { useState } from 'react'
import { MailCheck } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { FormMessage, TextInput } from '@/components/app/Field'
import { authErrorMessage } from './auth-errors'
import { getMessages, fmt } from '@/i18n'
import { EMAIL_RE } from '@/lib/validation'

export function ForgotForm() {
  const t = getMessages().app.auth.forgot
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [fieldErr, setFieldErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) { setFieldErr(getMessages().app.validation.email); return }
    setFieldErr(null); setBusy(true); setErr(null)
    const { error } = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: '/reset-password' })
    setBusy(false)
    // Same answer whether or not the account exists, so the form can't be used to find accounts.
    if (error && error.status === 429) { setErr(authErrorMessage(error)); return }
    setSent(true)
  }

  if (sent) return (
    <div role="status">
      <span className="icon-tile mb-4"><MailCheck aria-hidden="true" size={20} /></span>
      <h1 className="text-[28px] leading-9 font-bold">{t.sentTitle}</h1>
      <p className="mt-3 text-[var(--text-muted)]">{fmt(t.sentBody, { email: email.trim() })}</p>
      <Link href="/sign-in" className="link mt-6 inline-block text-[14px]">{t.back}</Link>
    </div>
  )
  return (
    <>
      <h1 className="text-[28px] leading-9 font-bold">{t.title}</h1>
      <p className="mt-2 text-[var(--text-muted)]">{t.subtitle}</p>
      <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
        <FormMessage>{err}</FormMessage>
        <TextInput label={t.email} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErr} />
        <button type="submit" className="m-btn primary lg w-full" aria-busy={busy} disabled={busy}>{busy ? t.submitting : t.submit}</button>
      </form>
      <Link href="/sign-in" className="link mt-6 inline-block text-[14px]">{t.back}</Link>
    </>
  )
}
