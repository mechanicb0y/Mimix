'use client'
import Link from 'next/link'
import { useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { FormMessage, PasswordInput, TextInput } from '@/components/app/Field'
import { getMessages } from '@/i18n'

export function SetupForm() {
  const t = getMessages().admin.setup
  const a = getMessages().app.auth
  const [v, setV] = useState({ email: '', token: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<ApiClientError | null>(null)
  if (done) return <div className="grid gap-4"><FormMessage tone="success">{t.done}</FormMessage><Link href="/sign-in?next=/admin" className="m-btn primary">{t.signIn}</Link></div>
  return (
    <form className="grid gap-4" noValidate onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(null)
      try { await api('/api/admin/setup', { method: 'POST', json: v }); setDone(true) }
      catch (x) { setErr(x instanceof ApiClientError ? x : new ApiClientError(0, 'network', getMessages().app.common.networkError)) }
      finally { setBusy(false) }
    }}>
      <TextInput label={t.email} type="email" autoComplete="username" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} error={err?.fields.email ?? null} required />
      <PasswordInput label={t.token} hint={t.tokenHint} autoComplete="off" value={v.token} onChange={(e) => setV({ ...v, token: e.target.value })} error={err?.fields.token ?? null} showLabel={a.showPassword} hideLabel={a.hidePassword} required />
      <PasswordInput label={t.password} hint={t.passwordHint} autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} error={err?.fields.password ?? null} showLabel={a.showPassword} hideLabel={a.hidePassword} required />
      {err && !err.fields.email && !err.fields.token && !err.fields.password ? <FormMessage>{err.message}</FormMessage> : null}
      <button type="submit" className="m-btn primary" aria-busy={busy} disabled={busy}>{t.submit}</button>
    </form>
  )
}
