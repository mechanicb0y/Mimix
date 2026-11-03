'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Plus } from 'lucide-react'
import { useId, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages, fmt, formatNumber, formatDateTime } from '@/i18n'
import { API_SCOPES, type ApiScope } from '@/config/api'
import { KEY_RATE_DEFAULT, KEY_RATE_MAX } from '@/lib/schemas/developers'
import { Field, FormMessage, TextInput } from '@/components/app/Field'
import { ConfirmButton } from '@/components/app/Confirm'
import { SecretDialog } from './SecretDialog'

export interface ApiKeyView {
  id: string; name: string; prefix: string; scopes: ApiScope[]; rateLimitPerMinute: number; creditLimit: number | null
  creditsThisMonth: number; lastUsedAt: string | null; createdAt: string; revokedAt: string | null
}

const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s))

export function KeysPanel({ canManage }: { canManage: boolean }) {
  const t = getMessages().app.developers.keys
  const d = getMessages().app.developers
  const c = getMessages().app.common
  const id = useId()
  const qc = useQueryClient()
  const keys = useQuery({ queryKey: ['api-keys'], queryFn: () => api<{ items: ApiKeyView[] }>('/api/v1/keys'), enabled: canManage })
  const [creating, setCreating] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  if (!canManage) return <FormMessage tone="info">{d.adminsOnly}</FormMessage>
  const items = keys.data?.items ?? []

  return (
    <section className="grid gap-4" aria-labelledby={`${id}-t`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[640px]">
          <h2 id={`${id}-t`} className="text-[18px] font-semibold">{t.title}</h2>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">{t.body}</p>
        </div>
        {!creating ? <button type="button" className="m-btn primary" onClick={() => { setCreating(true); setNotice('') }}><Plus aria-hidden="true" />{t.create}</button> : null}
      </div>
      {creating ? (
        <CreateKeyForm
          onCancel={() => setCreating(false)}
          onCreated={(key) => { setCreating(false); setSecret(key); void qc.invalidateQueries({ queryKey: ['api-keys'] }) }}
        />
      ) : null}
      {notice ? <FormMessage tone="success">{notice}</FormMessage> : null}
      {keys.isLoading ? <div className="m-skeleton h-32" aria-hidden="true" /> : keys.isError ? (
        <FormMessage>{keys.error instanceof ApiClientError ? keys.error.message : c.networkError}</FormMessage>
      ) : !items.length ? (
        <div className="app-empty"><KeyRound aria-hidden="true" /><p>{t.empty}</p></div>
      ) : (
        <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label={t.title}>
          <table className="app-table">
            <thead>
              <tr>
                <th scope="col">{t.columns.name}</th><th scope="col">{t.columns.key}</th><th scope="col">{t.columns.scopes}</th>
                <th scope="col">{t.columns.used}</th><th scope="col">{t.columns.lastUsed}</th><th scope="col">{t.columns.status}</th>
                <th scope="col"><span className="sr-only">{c.more}</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((k) => <KeyRow key={k.id} k={k} onChanged={(msg) => { setNotice(msg); void qc.invalidateQueries({ queryKey: ['api-keys'] }) }} />)}
            </tbody>
          </table>
        </div>
      )}
      <SecretDialog secret={secret} title={t.createdTitle} body={t.createdBody} copyLabel={t.copyKey} onClose={() => setSecret(null)} />
    </section>
  )
}

function CreateKeyForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (key: string) => void }) {
  const t = getMessages().app.developers.keys
  const c = getMessages().app.common
  const id = useId()
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<ApiScope[]>(['tts', 'voices:read'])
  const [cap, setCap] = useState('')
  const [rate, setRate] = useState(String(KEY_RATE_DEFAULT))
  const create = useMutation({
    mutationFn: () => api<{ key: string }>('/api/v1/keys', { method: 'POST', json: { name, scopes, creditLimit: numOrNull(cap), rateLimitPerMinute: Number(rate) } }),
    onSuccess: (r) => onCreated(r.key),
  })
  const err = create.error instanceof ApiClientError ? create.error : null
  const fields = err?.fields ?? {}
  const toggle = (s: ApiScope) => setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
  return (
    <form className="m-card grid gap-4 p-4 sm:p-6" noValidate onSubmit={(e) => { e.preventDefault(); create.mutate() }} aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="text-[16px] font-semibold">{t.create}</h3>
      <TextInput label={t.name} hint={t.nameHint} value={name} onChange={(e) => setName(e.target.value)} error={fields.name} maxLength={60} autoFocus />
      <fieldset aria-describedby={`${id}-sh${fields.scopes ? ` ${id}-se` : ''}`} aria-invalid={fields.scopes ? true : undefined}>
        <legend className="m-label">{t.scopes}</legend>
        <p id={`${id}-sh`} className="m-hint -mt-1 mb-2">{t.scopesHint}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {API_SCOPES.map((s) => (
            <label key={s} className="flex min-h-11 items-center gap-3 rounded-[12px] border border-[var(--border)] px-3 text-[14px]">
              <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={scopes.includes(s)} onChange={() => toggle(s)} />
              <span className="grid"><span className="font-semibold">{t.scopeNames[s]}</span><code className="text-[12px] text-[var(--text-subtle)]">{s}</code></span>
            </label>
          ))}
        </div>
        <button type="button" className="m-btn ghost sm mt-2" onClick={() => setScopes(scopes.length === API_SCOPES.length ? [] : [...API_SCOPES])}>{t.selectAll}</button>
        {fields.scopes ? <p id={`${id}-se`} className="m-error">{fields.scopes}</p> : null}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label={<>{t.creditLimit} <span className="font-normal text-[var(--text-subtle)]">({c.optional})</span></>} hint={t.creditLimitHint}
          inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value.replace(/[^\d]/g, ''))} error={fields.creditLimit} />
        <TextInput label={t.rateLimit} hint={fmt(t.rateLimitHint, { max: KEY_RATE_MAX })} inputMode="numeric" value={rate}
          onChange={(e) => setRate(e.target.value.replace(/[^\d]/g, ''))} error={fields.rateLimitPerMinute} />
      </div>
      {err && !Object.keys(err.fields).length ? <FormMessage>{err.message}</FormMessage> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="m-btn secondary" onClick={onCancel}>{c.cancel}</button>
        <button type="submit" className="m-btn primary" aria-busy={create.isPending} disabled={create.isPending}>{create.isPending ? c.saving : t.create}</button>
      </div>
    </form>
  )
}

function KeyRow({ k, onChanged }: { k: ApiKeyView; onChanged: (msg: string) => void }) {
  const t = getMessages().app.developers.keys
  const c = getMessages().app.common
  const [editing, setEditing] = useState(false)
  const [cap, setCap] = useState(k.creditLimit ? String(k.creditLimit) : '')
  const save = useMutation({
    mutationFn: () => api(`/api/v1/keys/${k.id}`, { method: 'PATCH', json: { creditLimit: numOrNull(cap) } }),
    onSuccess: () => { setEditing(false); onChanged(t.capSaved) },
  })
  const capErr = save.error instanceof ApiClientError ? save.error.fields.creditLimit ?? save.error.message : null
  const revoked = !!k.revokedAt
  return (
    <tr className={revoked ? 'text-[var(--text-subtle)]' : undefined}>
      <td className="font-semibold">{k.name}</td>
      <td><code className="text-[13px]">{k.prefix}…</code></td>
      <td><span className="flex max-w-[260px] flex-wrap gap-1">{k.scopes.map((s) => <span key={s} className="m-badge">{s}</span>)}</span></td>
      <td className="whitespace-nowrap">
        {editing ? (
          <form className="flex items-start gap-2" noValidate onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
            <Field label={<span className="sr-only">{t.creditLimit}</span>} error={capErr} className="w-[140px]">
              {(p) => <input className="m-input" inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value.replace(/[^\d]/g, ''))} placeholder={t.noCap} {...p} />}
            </Field>
            <button type="submit" className="m-btn primary sm" aria-busy={save.isPending} disabled={save.isPending}>{c.save}</button>
            <button type="button" className="m-btn ghost sm" onClick={() => setEditing(false)}>{c.cancel}</button>
          </form>
        ) : (
          <>
            {k.creditLimit ? fmt(t.usedOf, { used: formatNumber(k.creditsThisMonth), cap: formatNumber(k.creditLimit) }) : <>{formatNumber(k.creditsThisMonth)} <span className="text-[var(--text-subtle)]">({t.noCap})</span></>}
            {!revoked ? <button type="button" className="m-btn ghost sm ml-1" aria-label={fmt(t.editCapLabel, { name: k.name })} onClick={() => setEditing(true)}>{t.editCap}</button> : null}
          </>
        )}
      </td>
      <td className="whitespace-nowrap">{k.lastUsedAt ? formatDateTime(k.lastUsedAt) : t.neverUsed}</td>
      <td><span className={`m-badge${revoked ? '' : ' brand'}`}>{revoked ? t.revoked : t.active}</span></td>
      <td className="text-right">
        {!revoked ? (
          <ConfirmButton className="m-btn ghost sm text-[var(--danger)]" ariaLabel={fmt(t.revokeLabel, { name: k.name })} title={fmt(t.revokeTitle, { name: k.name })} body={t.revokeBody} confirmLabel={t.revoke}
            onConfirm={async () => { await api(`/api/v1/keys/${k.id}`, { method: 'DELETE' }); onChanged(t.revokedDone) }}>
            {t.revoke}
          </ConfirmButton>
        ) : null}
      </td>
    </tr>
  )
}
