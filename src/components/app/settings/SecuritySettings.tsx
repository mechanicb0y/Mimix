'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Laptop, ShieldCheck } from 'lucide-react'
import { encode } from 'uqr'
import { useMemo, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { getMessages, fmt, formatDateTime } from '@/i18n'
import { FormMessage, PasswordInput, TextInput } from '@/components/app/Field'
import { ConfirmButton } from '@/components/app/Confirm'
import { authErrorMessage } from '@/components/auth/auth-errors'
import { SecretDialog } from '@/components/app/developers/SecretDialog'
import { Section } from './Section'

const PASSWORD_MIN = 10
type Msg = { tone: 'error' | 'success'; text: string } | null

export function SecuritySettings({ hasPassword, twoFactorEnabled }: { hasPassword: boolean; twoFactorEnabled: boolean }) {
  return (
    <>
      <PasswordSection hasPassword={hasPassword} />
      <TwoFactorSection enabled={twoFactorEnabled} hasPassword={hasPassword} />
      <SessionsSection />
    </>
  )
}

function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const t = getMessages().app.settings.security
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [fields, setFields] = useState<{ current?: string; next?: string }>({})
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)
  const qc = useQueryClient()
  if (!hasPassword) return <Section title={t.password} body={t.noPassword} />
  const submit = async () => {
    setMsg(null)
    const f: typeof fields = {}
    if (!current) f.current = getMessages().app.validation.required
    if (next.length < PASSWORD_MIN) f.next = fmt(getMessages().errors.auth.tooShort, { min: PASSWORD_MIN })
    setFields(f)
    if (f.current || f.next) return
    setBusy(true)
    const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true })
    setBusy(false)
    if (error) {
      if (error.code === 'INVALID_PASSWORD') return setFields({ current: authErrorMessage(error) })
      if (error.code?.startsWith('PASSWORD')) return setFields({ next: authErrorMessage(error) })
      return setMsg({ tone: 'error', text: authErrorMessage(error) })
    }
    setCurrent(''); setNext('')
    setMsg({ tone: 'success', text: t.passwordChanged })
    void qc.invalidateQueries({ queryKey: ['sessions'] })
  }
  return (
    <Section title={t.password} body={t.passwordBody}>
      <form className="grid gap-3 sm:max-w-[420px]" noValidate onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <PasswordInput label={t.current} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={fields.current} showLabel={t.show} hideLabel={t.hide} />
        <PasswordInput label={t.next} hint={t.nextHint} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={fields.next} showLabel={t.show} hideLabel={t.hide} />
        <div><button type="submit" className="m-btn primary" aria-busy={busy} disabled={busy}>{t.changePassword}</button></div>
        {msg ? <FormMessage tone={msg.tone}>{msg.text}</FormMessage> : null}
      </form>
    </Section>
  )
}

/** A scannable QR code as SVG; dark modules on white whatever the theme, so phones can read it. */
function Qr({ text, label }: { text: string; label: string }) {
  const svg = useMemo(() => {
    const { data, size } = encode(text, { ecc: 'M', border: 2 })
    let d = ''
    data.forEach((row, y) => row.forEach((on, x) => { if (on) d += `M${x} ${y}h1v1h-1z` }))
    return { d, size }
  }, [text])
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${svg.size} ${svg.size}`} width={180} height={180} className="rounded-[8px] bg-white" shapeRendering="crispEdges">
      <path d={svg.d} fill="#000" />
    </svg>
  )
}

function TwoFactorSection({ enabled, hasPassword }: { enabled: boolean; hasPassword: boolean }) {
  const t = getMessages().app.settings.security
  const c = getMessages().app.common
  const router = useRouter()
  const [step, setStep] = useState<'idle' | 'password' | 'scan'>('idle')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [uri, setUri] = useState('')
  const [codes, setCodes] = useState<string[]>([])
  const [shownCodes, setShownCodes] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)
  const secret = uri ? new URL(uri).searchParams.get('secret') ?? '' : ''

  const begin = async () => {
    if (!password) return setErr(getMessages().app.validation.required)
    setBusy(true); setErr(null)
    const r = enabled ? await authClient.twoFactor.disable({ password }) : await authClient.twoFactor.enable({ password })
    setBusy(false)
    if (r.error) return setErr(authErrorMessage(r.error))
    setPassword('')
    if (enabled) { setStep('idle'); setMsg({ tone: 'success', text: t.disabled }); router.refresh(); return }
    const data = r.data as { totpURI: string; backupCodes: string[] }
    setUri(data.totpURI); setCodes(data.backupCodes); setStep('scan')
  }
  const verify = async () => {
    if (!/^\d{6}$/.test(code)) return setErr(getMessages().errors.auth.invalidCode)
    setBusy(true); setErr(null)
    const r = await authClient.twoFactor.verifyTotp({ code })
    setBusy(false)
    if (r.error) return setErr(authErrorMessage(r.error))
    setStep('idle'); setCode(''); setUri('')
    setMsg({ tone: 'success', text: t.enabled })
    setShownCodes(codes.join('\n'))
    router.refresh()
  }

  return (
    <Section title={t.twoFactor} body={t.twoFactorBody}
      actions={<span className={`m-badge${enabled ? ' brand' : ''}`}><ShieldCheck size={14} aria-hidden="true" />{enabled ? t.twoFactorOn : t.twoFactorOff}</span>}>
      {!hasPassword ? <p className="text-[14px] text-[var(--text-muted)]">{t.noPassword}</p> : step === 'idle' ? (
        <div><button type="button" className={enabled ? 'm-btn secondary' : 'm-btn primary'} onClick={() => { setStep('password'); setMsg(null) }}>{enabled ? t.disable : t.enable}</button></div>
      ) : step === 'password' ? (
        <form className="grid gap-3 sm:max-w-[420px]" noValidate onSubmit={(e) => { e.preventDefault(); void begin() }}>
          <PasswordInput label={t.confirmPassword} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={err} showLabel={t.show} hideLabel={t.hide} autoFocus />
          <div className="flex gap-2">
            <button type="button" className="m-btn secondary" onClick={() => { setStep('idle'); setErr(null) }}>{c.cancel}</button>
            <button type="submit" className="m-btn primary" aria-busy={busy} disabled={busy}>{c.next}</button>
          </div>
        </form>
      ) : (
        <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); void verify() }}>
          <p className="text-[14px]">{t.scan}</p>
          <div className="flex flex-wrap items-start gap-4">
            <Qr text={uri} label={t.qrAlt} />
            <div className="grid min-w-0 gap-1">
              <span className="m-label">{t.manualKey}</span>
              <code className="break-all font-mono text-[14px]" data-testid="totp-secret">{secret}</code>
            </div>
          </div>
          <div className="sm:max-w-[240px]">
            <TextInput label={t.code} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} error={err} autoFocus />
          </div>
          <div className="flex gap-2">
            <button type="button" className="m-btn secondary" onClick={() => { setStep('idle'); setErr(null); setUri('') }}>{c.cancel}</button>
            <button type="submit" className="m-btn primary" aria-busy={busy} disabled={busy}>{t.verify}</button>
          </div>
        </form>
      )}
      {msg ? <FormMessage tone={msg.tone}>{msg.text}</FormMessage> : null}
      <SecretDialog secret={shownCodes} title={t.backupTitle} body={t.backupBody} copyLabel={t.copyCodes} onClose={() => setShownCodes(null)} />
    </Section>
  )
}

interface SessionRow { id: string; token: string; userAgent?: string | null; ipAddress?: string | null; createdAt: string | Date; updatedAt: string | Date }

/** "Chrome on macOS" from a user-agent string, without a parsing library. */
function deviceName(ua: string | null | undefined, unknown: string): string {
  if (!ua) return unknown
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : null
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : null
  return browser && os ? `${browser} · ${os}` : browser ?? os ?? unknown
}

function SessionsSection() {
  const t = getMessages().app.settings.security
  const qc = useQueryClient()
  const [msg, setMsg] = useState<string | null>(null)
  const q = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const [list, me] = await Promise.all([authClient.listSessions(), authClient.getSession()])
      return { items: (list.data ?? []) as SessionRow[], current: me.data?.session.token ?? '' }
    },
  })
  const refresh = (m: string) => { setMsg(m); void qc.invalidateQueries({ queryKey: ['sessions'] }) }
  const items = [...(q.data?.items ?? [])].sort((a, b) => (a.token === q.data?.current ? -1 : b.token === q.data?.current ? 1 : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))
  return (
    <Section title={t.sessions} body={t.sessionsBody}
      actions={items.length > 1 ? (
        <ConfirmButton className="m-btn secondary sm" title={t.signOutOthers} body={t.sessionsBody} confirmLabel={t.signOutOthers}
          onConfirm={async () => { await authClient.revokeOtherSessions(); refresh(t.signedOut) }}>{t.signOutOthers}</ConfirmButton>
      ) : null}>
      {q.isLoading ? <div className="m-skeleton h-24" aria-hidden="true" /> : (
        <ul className="grid gap-2">
          {items.map((s) => {
            const name = deviceName(s.userAgent, t.unknownDevice)
            const current = s.token === q.data?.current
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--border)] p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Laptop aria-hidden="true" className="flex-none text-[var(--text-muted)]" />
                  <div className="min-w-0">
                    <p className="font-semibold">{name} {current ? <span className="m-badge brand ml-1">{t.thisDevice}</span> : null}</p>
                    <p className="text-[13px] text-[var(--text-muted)]">{fmt(t.lastActive, { date: formatDateTime(new Date(s.createdAt).toISOString()) })}{s.ipAddress ? ` · ${s.ipAddress}` : ''}</p>
                  </div>
                </div>
                {!current ? (
                  <button type="button" className="m-btn ghost sm" aria-label={fmt(t.signOutLabel, { device: name })}
                    onClick={async () => { await authClient.revokeSession({ token: s.token }); refresh(t.signedOut) }}>{t.signOut}</button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
      {msg ? <FormMessage tone="success">{msg}</FormMessage> : null}
    </Section>
  )
}
