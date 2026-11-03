'use client'
import Link from 'next/link'
import { useState } from 'react'
import { MailCheck } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { FormMessage, PasswordInput, TextInput } from '@/components/app/Field'
import { GoogleButton } from './GoogleButton'
import { authErrorMessage } from './auth-errors'
import { getMessages, fmt } from '@/i18n'
import { EMAIL_RE } from '@/lib/validation'

export const PASSWORD_MIN = 10

/** Rough strength from length and variety; the server's breached check is what blocks. */
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < PASSWORD_MIN) return 0
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/, / /].filter((r) => r.test(pw)).length
  if (pw.length >= 16 || (pw.length >= 12 && kinds >= 3)) return 3
  return kinds >= 2 ? 2 : 1
}

export function SignUpForm({ google, next }: { google: boolean; next: string }) {
  const t = getMessages().app.auth
  const v = getMessages().app.validation
  const e = getMessages().errors.auth
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const strength = passwordStrength(password)

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    const f: Record<string, string> = {}
    if (!name.trim()) f.name = v.nameRequired
    else if (name.trim().length > 60) f.name = v.nameTooLong
    if (!EMAIL_RE.test(email.trim())) f.email = v.email
    if (password.length < PASSWORD_MIN) f.password = fmt(e.tooShort, { min: PASSWORD_MIN })
    setFields(f)
    if (Object.keys(f).length) { document.getElementById(`su-${Object.keys(f)[0]}`)?.focus(); return }
    setBusy(true); setError(null)
    const { error: err } = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password, callbackURL: `/verify-email?next=${encodeURIComponent(next)}` })
    setBusy(false)
    if (err) {
      if (err.code === 'PASSWORD_BREACHED' || err.code?.startsWith('PASSWORD')) { setFields({ password: authErrorMessage(err) }); document.getElementById('su-password')?.focus(); return }
      setError(authErrorMessage(err)); return
    }
    setSentTo(email.trim())
  }

  if (sentTo) {
    return (
      <div role="status">
        <span className="icon-tile mb-4"><MailCheck aria-hidden="true" size={20} /></span>
        <h1 className="text-[28px] leading-9 font-bold">{t.signUp.checkTitle}</h1>
        <p className="mt-3 text-[var(--text-muted)]">{fmt(t.signUp.checkBody, { email: sentTo })}</p>
        <button type="button" className="link mt-6 text-[14px]" onClick={() => { setSentTo(null); setPassword('') }}>{t.signUp.wrongEmail}</button>
      </div>
    )
  }

  const strengthLabel = [null, t.strength.weak, t.strength.fair, t.strength.strong][strength]
  return (
    <>
      <h1 className="text-[28px] leading-9 font-bold">{t.signUp.title}</h1>
      <p className="mt-2 text-[var(--text-muted)]">{t.signUp.subtitle}</p>
      {google ? (
        <div className="mt-6 grid gap-4">
          <GoogleButton label={t.signUp.google} next={next} />
          <div className="flex items-center gap-3 text-[13px] text-[var(--text-subtle)]"><span className="hairline flex-1" />{t.signIn.or}<span className="hairline flex-1" /></div>
        </div>
      ) : null}
      <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
        <FormMessage>{error}</FormMessage>
        <TextInput id="su-name" label={t.signUp.name} name="name" autoComplete="name" required maxLength={60} value={name} onChange={(ev) => setName(ev.target.value)} error={fields.name} />
        <TextInput id="su-email" label={t.signUp.email} type="email" name="email" autoComplete="email" required value={email} onChange={(ev) => setEmail(ev.target.value)} error={fields.email} />
        <div>
          <PasswordInput id="su-password" label={t.signUp.password} name="password" autoComplete="new-password" required minLength={PASSWORD_MIN} maxLength={128} value={password}
            onChange={(ev) => setPassword(ev.target.value)} error={fields.password} hint={t.signUp.passwordHint} showLabel={t.showPassword} hideLabel={t.hidePassword} />
          {password ? (
            <div className="mt-2 flex items-center gap-2" aria-live="polite">
              <div className="flex flex-1 gap-1" aria-hidden="true">
                {[1, 2, 3].map((i) => <span key={i} className="h-1 flex-1 rounded-full" style={{ background: strength >= i ? (strength === 1 ? 'var(--warning)' : 'var(--success)') : 'var(--surface-3)' }} />)}
              </div>
              {strengthLabel ? <span className="text-[13px] text-[var(--text-muted)]">{t.strength.label}: {strengthLabel}</span> : null}
            </div>
          ) : null}
        </div>
        <p className="text-[13px] leading-[18px] text-[var(--text-subtle)]">
          {t.signUp.terms.split(/(\{terms\}|\{privacy\})/).map((part, i) => part === '{terms}' ? <Link key={i} href="/legal/terms" className="link">{t.signUp.termsLink}</Link> : part === '{privacy}' ? <Link key={i} href="/legal/privacy" className="link">{t.signUp.privacyLink}</Link> : part)}
        </p>
        <button type="submit" className="m-btn primary lg w-full" aria-busy={busy} disabled={busy}>{busy ? t.signUp.submitting : t.signUp.submit}</button>
      </form>
      <p className="mt-6 text-[14px] text-[var(--text-muted)]">{t.signUp.haveAccount} <Link href="/sign-in" className="link">{t.signUp.signInLink}</Link></p>
    </>
  )
}
