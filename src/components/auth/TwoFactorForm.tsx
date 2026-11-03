'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { FormMessage, TextInput } from '@/components/app/Field'
import { authErrorMessage } from './auth-errors'
import { getMessages } from '@/i18n'

export function TwoFactorForm({ next }: { next: string }) {
  const t = getMessages().app.auth.twoFactor
  const router = useRouter()
  const [backup, setBackup] = useState(false)
  const [code, setCode] = useState('')
  const [trust, setTrust] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(null)
    const res = backup
      ? await authClient.twoFactor.verifyBackupCode({ code: code.trim(), trustDevice: trust })
      : await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, ''), trustDevice: trust })
    setBusy(false)
    if (res.error) { setErr(authErrorMessage(res.error)); return }
    router.replace(next); router.refresh()
  }

  return (
    <>
      <h1 className="text-[28px] leading-9 font-bold">{t.title}</h1>
      <p className="mt-2 text-[var(--text-muted)]">{backup ? t.backupHint : t.subtitle}</p>
      <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
        <FormMessage>{err}</FormMessage>
        {backup
          ? <TextInput key="b" label={t.backupCode} autoComplete="one-time-code" autoFocus value={code} onChange={(e) => setCode(e.target.value)} />
          : <TextInput key="t" label={t.code} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} autoFocus value={code} onChange={(e) => setCode(e.target.value)} />}
        <label className="flex items-center gap-3 text-[14px]"><input type="checkbox" className="size-5 accent-[var(--primary)]" checked={trust} onChange={(e) => setTrust(e.target.checked)} />{t.trust}</label>
        <button type="submit" className="m-btn primary lg w-full" aria-busy={busy} disabled={busy || code.trim().length < 6}>{busy ? t.submitting : t.submit}</button>
      </form>
      <button type="button" className="link mt-6 text-[14px]" onClick={() => { setBackup((b) => !b); setCode(''); setErr(null) }}>{backup ? t.useApp : t.useBackup}</button>
    </>
  )
}
