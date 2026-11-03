'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useId, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages, fmt, formatDate } from '@/i18n'
import { ASSIGNABLE_ROLES, type AssignableRole } from '@/lib/schemas/account'
import type { WorkspaceRole } from '@/server/db/schema'
import { Field, FormMessage, TextInput } from '@/components/app/Field'
import { ConfirmButton } from '@/components/app/Confirm'
import { Section } from './Section'

interface Member { userId: string; name: string; email: string; role: WorkspaceRole; joinedAt: string }
interface Invite { id: string; email: string; role: WorkspaceRole; expiresAt: string }
interface Team { workspace: { id: string; name: string; planId: string }; seats: number | null; members: Member[]; invites: Invite[] }

const day = (iso: string) => formatDate(iso.slice(0, 10))

export function TeamSettings({ me, myRole }: { me: string; myRole: WorkspaceRole }) {
  const t = getMessages().app.settings.team
  const c = getMessages().app.common
  const qc = useQueryClient()
  const router = useRouter()
  const q = useQuery({ queryKey: ['team'], queryFn: () => api<Team>('/api/v1/team') })
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const canManage = myRole === 'owner' || myRole === 'admin'
  const ok = (text: string) => { setNotice({ tone: 'success', text }); void qc.invalidateQueries({ queryKey: ['team'] }) }
  const fail = (e: unknown) => setNotice({ tone: 'error', text: e instanceof ApiClientError ? e.message : c.networkError })
  const run = (fn: () => Promise<unknown>, text: string) => async () => { try { await fn(); ok(text) } catch (e) { fail(e) } }

  if (q.isLoading) return <div className="m-skeleton h-64" aria-hidden="true" />
  if (q.isError || !q.data) return <FormMessage>{q.error instanceof ApiClientError ? q.error.message : c.networkError}</FormMessage>
  const team = q.data
  const used = team.members.length + team.invites.length
  const full = team.seats !== null && used >= team.seats

  return (
    <>
      <Section title={t.title} body={t.body}
        actions={<span className="m-badge">{team.seats === null ? fmt(t.seatsUnlimited, { used: team.members.length }) : fmt(t.seatsUsed, { used, seats: team.seats })}</span>}>
        <div aria-live="polite">{notice ? <FormMessage tone={notice.tone}>{notice.text}</FormMessage> : null}</div>
        <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label={t.title}>
          <table className="app-table">
            <thead><tr><th scope="col">{t.columns.person}</th><th scope="col">{t.columns.role}</th><th scope="col">{t.columns.joined}</th><th scope="col"><span className="sr-only">{c.more}</span></th></tr></thead>
            <tbody>
              {team.members.map((m) => {
                const self = m.userId === me
                const canEdit = canManage && !self && m.role !== 'owner' && (myRole === 'owner' || m.role !== 'admin')
                return (
                  <tr key={m.userId}>
                    <td><span className="font-semibold">{m.name}</span> {self ? <span className="text-[var(--text-muted)]">{t.you}</span> : null}<span className="block text-[13px] text-[var(--text-muted)]">{m.email}</span></td>
                    <td>
                      {canEdit ? (
                        <RoleSelect value={m.role as AssignableRole} label={fmt(t.roleLabel, { name: m.name })} allowAdmin={myRole === 'owner'}
                          onChange={(role) => run(() => api(`/api/v1/team/members/${m.userId}`, { method: 'PATCH', json: { role } }), t.roleSaved)()} />
                      ) : t.roles[m.role]}
                    </td>
                    <td className="whitespace-nowrap">{day(m.joinedAt)}</td>
                    <td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {myRole === 'owner' && m.role === 'admin' ? (
                          <ConfirmButton ariaLabel={fmt(t.transferLabel, { name: m.name })} title={fmt(t.transferTitle, { name: m.name })} body={t.transferBody} confirmLabel={t.transfer}
                            onConfirm={async () => { try { await api('/api/v1/team/transfer', { method: 'POST', json: { userId: m.userId } }); ok(t.transferred); router.refresh() } catch (e) { fail(e) } }}>
                            {t.transfer}
                          </ConfirmButton>
                        ) : null}
                        {canEdit ? (
                          <ConfirmButton className="m-btn ghost sm text-[var(--danger)]" ariaLabel={fmt(t.removeLabel, { name: m.name })} title={fmt(t.removeTitle, { name: m.name })} body={t.removeBody} confirmLabel={t.remove}
                            onConfirm={run(() => api(`/api/v1/team/members/${m.userId}`, { method: 'DELETE' }), fmt(t.removed, { name: m.name }))}>
                            {t.remove}
                          </ConfirmButton>
                        ) : null}
                        {self && m.role !== 'owner' ? (
                          <ConfirmButton className="m-btn ghost sm" title={t.leaveTitle} body={t.leaveBody} confirmLabel={t.leave}
                            onConfirm={async () => {
                              try { await api(`/api/v1/team/members/${m.userId}`, { method: 'DELETE' }); router.push('/app'); router.refresh() } catch (e) { fail(e) }
                            }}>
                            {t.leave}
                          </ConfirmButton>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {team.invites.length ? (
          <>
            <h3 className="text-[16px] font-semibold">{t.pending}</h3>
            <ul className="grid gap-2">
              {team.invites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[var(--border)] p-3">
                  <span><span className="font-semibold">{i.email}</span> · {t.roles[i.role]} <span className="block text-[13px] text-[var(--text-muted)]">{fmt(t.expires, { date: day(i.expiresAt) })}</span></span>
                  {canManage ? <button type="button" className="m-btn ghost sm" aria-label={fmt(t.revokeInviteLabel, { email: i.email })} onClick={run(() => api(`/api/v1/team/invites/${i.id}`, { method: 'DELETE' }), t.inviteCancelled)}>{t.revokeInvite}</button> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Section>
      {!canManage ? <FormMessage tone="info">{t.manageOnly}</FormMessage>
        : team.seats === 1 ? <FormMessage tone="info">{t.soloPlan} <Link href="/app/settings/billing" className="link">{getMessages().app.common.upgrade}</Link></FormMessage>
        : <InviteForm full={full} seats={team.seats} onSent={(email) => ok(fmt(t.sent, { email }))} />}
    </>
  )
}

function RoleSelect({ value, label, allowAdmin, onChange }: { value: AssignableRole; label: string; allowAdmin: boolean; onChange: (r: AssignableRole) => void }) {
  const t = getMessages().app.settings.team
  return (
    <select className="m-select w-[140px]" aria-label={label} value={value} onChange={(e) => onChange(e.target.value as AssignableRole)}>
      {ASSIGNABLE_ROLES.filter((r) => allowAdmin || r !== 'admin' || value === 'admin').map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
    </select>
  )
}

function InviteForm({ full, seats, onSent }: { full: boolean; seats: number | null; onSent: (email: string) => void }) {
  const t = getMessages().app.settings.team
  const id = useId()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AssignableRole>('member')
  const send = useMutation({
    mutationFn: () => api('/api/v1/team/invites', { method: 'POST', json: { email, role } }),
    onSuccess: () => { onSent(email.trim()); setEmail('') },
  })
  const err = send.error instanceof ApiClientError ? send.error : null
  return (
    <section className="m-card grid gap-4 p-4 sm:p-6" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="text-[18px] font-semibold">{t.invite}</h2>
      {full ? <FormMessage tone="info">{fmt(getMessages().errors.app.account.seatsFull, { seats: seats ?? 0 })}</FormMessage> : null}
      <form className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px_auto] sm:items-start" noValidate onSubmit={(e) => { e.preventDefault(); send.mutate() }}>
        <TextInput label={t.email} type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} error={err?.fields.email} disabled={full} />
        <Field label={t.role} hint={t.roleHints[role]} error={err?.fields.role}>
          {(p) => (
            <select className="m-select" value={role} onChange={(e) => setRole(e.target.value as AssignableRole)} disabled={full} {...p}>
              {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
            </select>
          )}
        </Field>
        <button type="submit" className="m-btn primary sm:mt-[26px]" aria-busy={send.isPending} disabled={send.isPending || full}>{t.send}</button>
      </form>
      {err && !Object.keys(err.fields).length ? <FormMessage>{err.message}</FormMessage> : null}
    </section>
  )
}
