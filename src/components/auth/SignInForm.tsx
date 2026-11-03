'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { FormMessage, PasswordInput, TextInput } from '@/components/app/Field'
import { GoogleButton } from './GoogleButton'
import { authErrorMessage } from './auth-errors'
import { getMessages } from '@/i18n'

export function SignInForm({ next, google }: { next: string; google: boolean }) {
  const t = getMessages().app.auth
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unverified, setUnverified] = useState(false)
  const [resent, setResent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null); setUnverified(false)
    const { data, error: err } = await authClient.signIn.email({ email: email.trim(), password, callbackURL: next })
    setBusy(false)
    if (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') setUnverified(true)
      setError(authErrorMessage(err))
      return
    }
    if ((data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) { router.push(`/two-factor?next=${encodeURIComponent(next)}`); return }
    router.replace(next)
    router.refresh()
  }

  return (
    <>
      <h1 className="text-[28px] leading-9 font-bold">{t.signIn.title}</h1>
      <p className="mt-2 text-[var(--text-muted)]">{t.signIn.subtitle}</p>
      {google ? (
        <div className="mt-6 grid gap-4">
          <GoogleButton label={t.signIn.google} next={next} />
          <div className="flex items-center gap-3 text-[13px] text-[var(--text-subtle)]"><span className="hairline flex-1" />{t.signIn.or}<span className="hairline flex-1" /></div>
        </div>
      ) : null}
      <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
        <FormMessage>{error}</FormMessage>
        {unverified ? (
          <button type="button" className="m-btn secondary sm justify-self-start" disabled={resent}
            onClick={async () => { await authClient.sendVerificationEmail({ email: email.trim(), callbackURL: '/verify-email' }); setResent(true) }}>
            {resent ? t.signIn.resent : t.signIn.resend}
          </button>
        ) : null}
        <TextInput label={t.signIn.email} type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordInput label={t.signIn.password} name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} showLabel={t.showPassword} hideLabel={t.hidePassword} />
        <Link href="/forgot-password" className="link justify-self-start text-[14px]">{t.signIn.forgot}</Link>
        <button type="submit" className="m-btn primary lg w-full" aria-busy={busy} disabled={busy || !email || !password}>{busy ? t.signIn.submitting : t.signIn.submit}</button>
      </form>
      <p className="mt-6 text-[14px] text-[var(--text-muted)]">{t.signIn.noAccount} <Link href={`/sign-up${next !== '/app' ? `?next=${encodeURIComponent(next)}` : ''}`} className="link">{t.signIn.signUpLink}</Link></p>
    </>
  )
}
