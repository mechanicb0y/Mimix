'use client'
import Link from 'next/link'
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { FormMessage, PasswordInput } from '@/components/app/Field'
import { authErrorMessage } from './auth-errors'
import { PASSWORD_MIN } from './SignUpForm'
import { getMessages, fmt } from '@/i18n'

export function ResetForm({ token, invalid }: { token: string | null; invalid: boolean }) {
  const t = getMessages().app.auth
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fields, setFields] = useState<{ pw?: string; confirm?: string }>({})
  const [err, setErr] = useState<string | null>(null)
  const [expired, setExpired] = useState(invalid || !token)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  if (expired) return (
    <div>
      <h1 className="text-[28px] leading-9 font-bold">{t.reset.invalidTitle}</h1>
      <p className="mt-3 text-[var(--text-muted)]">{t.reset.invalidBody}</p>
      <Link href="/forgot-password" className="m-btn primary mt-6">{t.reset.requestNew}</Link>
    </div>
  )
  if (done) return (
    <div role="status">
      <span className="icon-tile mb-4"><CheckCircle2 aria-hidden="true" size={20} /></span>
      <h1 className="text-[28px] leading-9 font-bold">{t.reset.doneTitle}</h1>
      <p className="mt-3 text-[var(--text-muted)]">{t.reset.doneBody}</p>
      <Link href="/sign-in" className="m-btn primary mt-6">{t.reset.signIn}</Link>
    </div>
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const f: typeof fields = {}
    if (pw.length < PASSWORD_MIN) f.pw = fmt(getMessages().errors.auth.tooShort, { min: PASSWORD_MIN })
    if (pw !== confirm) f.confirm = t.reset.mismatch
    setFields(f)
    if (f.pw || f.confirm) return
    setBusy(true); setErr(null)
    const { error } = await authClient.resetPassword({ newPassword: pw, token: token! })
    setBusy(false)
    if (error) {
      if (error.code === 'INVALID_TOKEN') { setExpired(true); return }
      if (error.code?.startsWith('PASSWORD')) { setFields({ pw: authErrorMessage(error) }); return }
      setErr(authErrorMessage(error)); return
    }
    setDone(true)
  }

  return (
    <>
      <h1 className="text-[28px] leading-9 font-bold">{t.reset.title}</h1>
      <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
        <FormMessage>{err}</FormMessage>
        <PasswordInput label={t.reset.password} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} error={fields.pw} hint={t.signUp.passwordHint} showLabel={t.showPassword} hideLabel={t.hidePassword} />
        <PasswordInput label={t.reset.confirm} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={fields.confirm} showLabel={t.showPassword} hideLabel={t.hidePassword} />
        <button type="submit" className="m-btn primary lg w-full" aria-busy={busy} disabled={busy}>{busy ? t.reset.submitting : t.reset.submit}</button>
      </form>
    </>
  )
}
