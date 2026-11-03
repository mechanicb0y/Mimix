'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { api, ApiClientError } from '@/lib/api-client'
import { EMAIL_RE } from '@/lib/validation'
import { getMessages, fmt } from '@/i18n'
import { FormMessage, TextInput } from '@/components/app/Field'
import { authErrorMessage } from '@/components/auth/auth-errors'
import { Section } from './Section'

type Msg = { tone: 'error' | 'success'; text: string } | null

export function ProfileSettings({ name, email, emailVerified, workspaceName, canRename }: { name: string; email: string; emailVerified: boolean; workspaceName: string; canRename: boolean }) {
  const t = getMessages().app.settings.profile
  const v = getMessages().app.validation
  const c = getMessages().app.common
  const router = useRouter()
  const [n, setN] = useState(name)
  const [nErr, setNErr] = useState<string | null>(null)
  const [nMsg, setNMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState<'' | 'name' | 'email' | 'ws'>('')
  const [newEmail, setNewEmail] = useState('')
  const [eErr, setEErr] = useState<string | null>(null)
  const [eMsg, setEMsg] = useState<Msg>(null)
  const [ws, setWs] = useState(workspaceName)
  const [wsErr, setWsErr] = useState<string | null>(null)
  const [wsMsg, setWsMsg] = useState<Msg>(null)

  const saveName = async () => {
    setNMsg(null)
    const trimmed = n.trim()
    if (!trimmed) return setNErr(v.nameRequired)
    if (trimmed.length > 80) return setNErr(v.nameTooLong)
    setNErr(null); setBusy('name')
    const r = await authClient.updateUser({ name: trimmed })
    setBusy('')
    if (r.error) return setNMsg({ tone: 'error', text: authErrorMessage(r.error) })
    setNMsg({ tone: 'success', text: t.saved })
    router.refresh()
  }

  const changeEmail = async () => {
    setEMsg(null)
    const e = newEmail.trim().toLowerCase()
    if (!e) return setEErr(v.emailRequired)
    if (!EMAIL_RE.test(e)) return setEErr(v.emailInvalid)
    setEErr(null); setBusy('email')
    const r = await authClient.changeEmail({ newEmail: e, callbackURL: '/app/settings/profile' })
    setBusy('')
    if (r.error) return setEMsg({ tone: 'error', text: authErrorMessage(r.error) })
    setEMsg({ tone: 'success', text: fmt(t.emailSent, { email }) })
    setNewEmail('')
  }

  const renameWs = async () => {
    setWsMsg(null); setBusy('ws')
    try {
      await api('/api/v1/workspace', { method: 'PATCH', json: { name: ws } })
      setWsErr(null); setWsMsg({ tone: 'success', text: t.workspaceSaved }); router.refresh()
    } catch (e) {
      if (e instanceof ApiClientError) { setWsErr(e.fields.name ?? null); if (!e.fields.name) setWsMsg({ tone: 'error', text: e.message }) }
    } finally { setBusy('') }
  }

  return (
    <>
      <Section title={t.title} body={t.body}>
        <form className="grid gap-3 sm:max-w-[420px]" noValidate onSubmit={(e) => { e.preventDefault(); void saveName() }}>
          <TextInput label={t.name} value={n} onChange={(e) => setN(e.target.value)} error={nErr} maxLength={80} autoComplete="name" />
          <div><button type="submit" className="m-btn primary" aria-busy={busy === 'name'} disabled={!!busy || n.trim() === name}>{busy === 'name' ? c.saving : t.save}</button></div>
          {nMsg ? <FormMessage tone={nMsg.tone}>{nMsg.text}</FormMessage> : null}
        </form>
      </Section>
      <Section title={t.email} body={t.emailBody}>
        <p className="flex flex-wrap items-center gap-2 text-[15px]"><span className="font-semibold">{email}</span>{!emailVerified ? <span className="m-badge">{t.unverified}</span> : null}</p>
        <form className="grid gap-3 sm:max-w-[420px]" noValidate onSubmit={(e) => { e.preventDefault(); void changeEmail() }}>
          <TextInput label={t.newEmail} type="email" inputMode="email" autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} error={eErr} maxLength={254} />
          <div><button type="submit" className="m-btn secondary" aria-busy={busy === 'email'} disabled={!!busy}>{t.changeEmail}</button></div>
          {eMsg ? <FormMessage tone={eMsg.tone}>{eMsg.text}</FormMessage> : null}
        </form>
      </Section>
      {canRename ? (
        <Section title={t.workspace} body={t.workspaceBody}>
          <form className="grid gap-3 sm:max-w-[420px]" noValidate onSubmit={(e) => { e.preventDefault(); void renameWs() }}>
            <TextInput label={t.workspace} value={ws} onChange={(e) => setWs(e.target.value)} error={wsErr} maxLength={80} />
            <div><button type="submit" className="m-btn primary" aria-busy={busy === 'ws'} disabled={!!busy || ws.trim() === workspaceName}>{busy === 'ws' ? c.saving : t.workspaceSave}</button></div>
            {wsMsg ? <FormMessage tone={wsMsg.tone}>{wsMsg.text}</FormMessage> : null}
          </form>
        </Section>
      ) : null}
    </>
  )
}
