'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Send, Trash2, Webhook } from 'lucide-react'
import { useId, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages, fmt, formatDateTime } from '@/i18n'
import { WEBHOOK_EVENTS, type WebhookEvent } from '@/config/api'
import { FormMessage, TextInput } from '@/components/app/Field'
import { ConfirmButton } from '@/components/app/Confirm'
import { SecretDialog } from './SecretDialog'

interface Hook { id: string; url: string; events: WebhookEvent[]; active: boolean; createdAt: string }
interface Delivery { id: string; event: string; status: 'pending' | 'delivered' | 'failed'; attempts: number; responseCode: number | null; nextAttemptAt: string | null; createdAt: string; payload: unknown }

export function WebhooksPanel({ canManage }: { canManage: boolean }) {
  const t = getMessages().app.developers.webhooks
  const d = getMessages().app.developers
  const c = getMessages().app.common
  const id = useId()
  const qc = useQueryClient()
  const hooks = useQuery({ queryKey: ['webhooks'], queryFn: () => api<{ items: Hook[] }>('/api/v1/webhooks'), enabled: canManage })
  const [adding, setAdding] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  if (!canManage) return <FormMessage tone="info">{d.adminsOnly}</FormMessage>
  const items = hooks.data?.items ?? []
  const refresh = () => qc.invalidateQueries({ queryKey: ['webhooks'] })

  return (
    <section className="grid gap-4" aria-labelledby={`${id}-t`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[640px]">
          <h2 id={`${id}-t`} className="text-[18px] font-semibold">{t.title}</h2>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">{t.body}</p>
        </div>
        {!adding ? <button type="button" className="m-btn primary" onClick={() => setAdding(true)}><Plus aria-hidden="true" />{t.add}</button> : null}
      </div>
      {adding ? <HookForm onCancel={() => setAdding(false)} onCreated={(s) => { setAdding(false); setSecret(s); void refresh() }} /> : null}
      {hooks.isLoading ? <div className="m-skeleton h-32" aria-hidden="true" /> : hooks.isError ? (
        <FormMessage>{hooks.error instanceof ApiClientError ? hooks.error.message : c.networkError}</FormMessage>
      ) : !items.length ? (
        <div className="app-empty"><Webhook aria-hidden="true" /><p>{t.empty}</p></div>
      ) : (
        <ul className="grid gap-4">
          {items.map((h) => <li key={h.id}><HookCard h={h} onChanged={refresh} onSecret={setSecret} /></li>)}
        </ul>
      )}
      <div className="m-card p-4 sm:p-6">
        <h3 className="text-[16px] font-semibold">{t.verifyTitle}</h3>
        <p className="mt-1 text-[14px] text-[var(--text-muted)]">{t.verifyBody}</p>
      </div>
      <SecretDialog secret={secret} title={t.secretTitle} body={t.secretBody} copyLabel={t.copySecret} onClose={() => setSecret(null)} />
    </section>
  )
}

function EventChecks({ value, onChange, error, idBase }: { value: WebhookEvent[]; onChange: (v: WebhookEvent[]) => void; error?: string; idBase: string }) {
  const t = getMessages().app.developers.webhooks
  return (
    <fieldset aria-describedby={error ? `${idBase}-ee` : undefined} aria-invalid={error ? true : undefined}>
      <legend className="m-label">{t.events}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {WEBHOOK_EVENTS.map((e) => (
          <label key={e} className="flex min-h-11 items-center gap-3 rounded-[12px] border border-[var(--border)] px-3 text-[14px]">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={value.includes(e)} onChange={() => onChange(value.includes(e) ? value.filter((x) => x !== e) : [...value, e])} />
            <span className="grid"><span className="font-semibold">{t.eventNames[e]}</span><code className="text-[12px] text-[var(--text-subtle)]">{e}</code></span>
          </label>
        ))}
      </div>
      {error ? <p id={`${idBase}-ee`} className="m-error">{error}</p> : null}
    </fieldset>
  )
}

function HookForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (secret: string) => void }) {
  const t = getMessages().app.developers.webhooks
  const c = getMessages().app.common
  const id = useId()
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<WebhookEvent[]>(['job.succeeded', 'job.failed'])
  const create = useMutation({
    mutationFn: () => api<{ secret: string }>('/api/v1/webhooks', { method: 'POST', json: { url, events } }),
    onSuccess: (r) => onCreated(r.secret),
  })
  const err = create.error instanceof ApiClientError ? create.error : null
  return (
    <form className="m-card grid gap-4 p-4 sm:p-6" noValidate onSubmit={(e) => { e.preventDefault(); create.mutate() }} aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="text-[16px] font-semibold">{t.add}</h3>
      <TextInput label={t.url} hint={t.urlHint} type="url" inputMode="url" placeholder="https://example.com/mimix" value={url} onChange={(e) => setUrl(e.target.value)} error={err?.fields.url} autoFocus />
      <EventChecks value={events} onChange={setEvents} error={err?.fields.events} idBase={id} />
      {err && !Object.keys(err.fields).length ? <FormMessage>{err.message}</FormMessage> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="m-btn secondary" onClick={onCancel}>{c.cancel}</button>
        <button type="submit" className="m-btn primary" aria-busy={create.isPending} disabled={create.isPending}>{create.isPending ? c.saving : t.add}</button>
      </div>
    </form>
  )
}

function HookCard({ h, onChanged, onSecret }: { h: Hook; onChanged: () => void; onSecret: (s: string) => void }) {
  const t = getMessages().app.developers.webhooks
  const c = getMessages().app.common
  const id = useId()
  const qc = useQueryClient()
  const [events, setEvents] = useState(h.events)
  const [open, setOpen] = useState(false)
  const deliveries = useQuery({ queryKey: ['deliveries', h.id], queryFn: () => api<{ items: Delivery[] }>(`/api/v1/webhooks/${h.id}/deliveries`), enabled: open })
  const patch = useMutation({ mutationFn: (json: Partial<Pick<Hook, 'active' | 'events'>>) => api(`/api/v1/webhooks/${h.id}`, { method: 'PATCH', json }), onSuccess: onChanged })
  const test = useMutation({
    mutationFn: () => api<{ status: Delivery['status']; responseCode: number | null }>(`/api/v1/webhooks/${h.id}/test`, { method: 'POST' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['deliveries', h.id] }),
  })
  const dirty = events.length !== h.events.length || events.some((e) => !h.events.includes(e))
  const code = (n: number | null) => (n === null ? t.noResponse : fmt(t.httpCode, { code: n }))
  const testMsg = test.data
    ? test.data.status === 'delivered' ? <FormMessage tone="success">{fmt(t.testOk, { code: code(test.data.responseCode) })}</FormMessage> : <FormMessage>{fmt(t.testFailed, { reason: code(test.data.responseCode) })}</FormMessage>
    : test.error instanceof ApiClientError ? <FormMessage>{test.error.message}</FormMessage> : null
  const patchErr = patch.error instanceof ApiClientError ? patch.error : null

  return (
    <article className="m-card grid gap-4 p-4 sm:p-6" aria-labelledby={`${id}-u`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 id={`${id}-u`} className="min-w-0 break-all font-mono text-[14px] font-semibold">{h.url}</h3>
          <span className={`m-badge${h.active ? ' brand' : ''}`}>{h.active ? t.active : t.paused}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="m-btn secondary sm" aria-busy={test.isPending} disabled={test.isPending || !h.active} onClick={() => test.mutate()}><Send aria-hidden="true" />{t.test}</button>
          <button type="button" className="m-btn ghost sm" disabled={patch.isPending} onClick={() => patch.mutate({ active: !h.active })}>{h.active ? t.pause : t.resume}</button>
          <ConfirmButton className="m-btn ghost sm" title={t.rotateTitle} body={t.rotateBody} confirmLabel={t.rotate}
            onConfirm={async () => { const r = await api<{ secret: string }>(`/api/v1/webhooks/${h.id}/rotate`, { method: 'POST' }); onSecret(r.secret) }}>
            {t.rotate}
          </ConfirmButton>
          <ConfirmButton className="m-btn ghost icon sm" ariaLabel={fmt(t.deleteLabel, { url: h.url })} title={t.deleteTitle}
            onConfirm={async () => { await api(`/api/v1/webhooks/${h.id}`, { method: 'DELETE' }); onChanged() }}>
            <Trash2 aria-hidden="true" />
          </ConfirmButton>
        </div>
      </div>
      <div aria-live="polite">{testMsg}</div>
      <EventChecks value={events} onChange={setEvents} error={patchErr?.fields.events} idBase={id} />
      {patchErr && !Object.keys(patchErr.fields).length ? <FormMessage>{patchErr.message}</FormMessage> : null}
      {dirty ? (
        <div className="flex justify-end gap-2">
          <button type="button" className="m-btn secondary sm" onClick={() => setEvents(h.events)}>{c.cancel}</button>
          <button type="button" className="m-btn primary sm" aria-busy={patch.isPending} disabled={patch.isPending} onClick={() => patch.mutate({ events })}>{c.save}</button>
        </div>
      ) : null}
      <details onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="min-h-11 cursor-pointer py-2 text-[14px] font-semibold">{t.deliveries}</summary>
        {deliveries.isLoading ? <div className="m-skeleton h-20" aria-hidden="true" /> : !deliveries.data?.items.length ? <p className="py-3 text-[14px] text-[var(--text-muted)]">{t.deliveriesEmpty}</p> : (
          <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label={t.deliveries}>
            <table className="app-table">
              <thead><tr>
                <th scope="col">{t.deliveryColumns.event}</th><th scope="col">{t.deliveryColumns.status}</th><th scope="col">{t.deliveryColumns.code}</th>
                <th scope="col">{t.deliveryColumns.attempts}</th><th scope="col">{t.deliveryColumns.when}</th>
              </tr></thead>
              <tbody>
                {deliveries.data.items.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <code className="text-[13px]">{x.event}</code>
                      <details className="mt-1"><summary className="cursor-pointer text-[12px] text-[var(--text-muted)]">{t.showPayload}</summary>
                        <pre className="mt-1 max-w-[420px] overflow-x-auto rounded-[8px] bg-[var(--surface-2)] p-2 text-[12px]">{JSON.stringify(x.payload, null, 2)}</pre>
                      </details>
                    </td>
                    <td className="whitespace-nowrap">
                      {t.deliveryStatus[x.status]}
                      {x.status === 'pending' && x.nextAttemptAt ? <span className="block text-[12px] text-[var(--text-subtle)]">{fmt(t.nextTry, { time: formatDateTime(x.nextAttemptAt) })}</span> : null}
                    </td>
                    <td className="whitespace-nowrap">{code(x.responseCode)}</td>
                    <td>{x.attempts}</td>
                    <td className="whitespace-nowrap">{formatDateTime(x.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </article>
  )
}
