'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertDialog } from 'radix-ui'
import { useRouter } from 'next/navigation'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { useJob } from '@/lib/use-job'
import { getMessages, fmt, formatDate, formatDateTime } from '@/i18n'
import { DELETION_GRACE_DAYS } from '@/lib/schemas/account'
import { FormMessage, TextInput } from '@/components/app/Field'
import { JobProgress } from '@/components/app/JobProgress'
import { Section } from './Section'

interface Export { id: string; jobId: string | null; createdAt: string; expiresAt: string | null; status: 'preparing' | 'ready' | 'expired' | 'failed' }
interface Deletion { requestedAt: string | null; purgeAt: string | null; blockers: Array<{ id: string; name: string }> }

const day = (iso: string) => formatDate(iso.slice(0, 10))

export function DataSettings({ email }: { email: string }) {
  return (
    <>
      <ExportSection />
      <DeleteSection email={email} />
    </>
  )
}

function ExportSection() {
  const t = getMessages().app.settings.data
  const c = getMessages().app.common
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['exports'], queryFn: () => api<{ items: Export[] }>('/api/v1/account/exports') })
  const job = useJob(() => { void qc.invalidateQueries({ queryKey: ['exports'] }) }, { resume: { types: ['data_export'] } })
  const start = useMutation({
    mutationFn: () => api<{ id: string; jobId: string }>('/api/v1/account/exports', { method: 'POST' }),
    onSuccess: (r) => { job.start(r.jobId); void qc.invalidateQueries({ queryKey: ['exports'] }) },
  })
  const items = q.data?.items ?? []
  const preparing = items.find((e) => e.status === 'preparing')
  return (
    <Section title={t.exportTitle} body={t.exportBody}>
      <div><button type="button" className="m-btn primary" aria-busy={start.isPending} disabled={start.isPending || !!preparing} onClick={() => start.mutate()}>{t.exportStart}</button></div>
      {start.isSuccess ? <FormMessage tone="success">{t.exportStarted}</FormMessage> : null}
      {start.error ? <FormMessage>{start.error instanceof ApiClientError ? start.error.message : c.networkError}</FormMessage> : null}
      {job.job ? <JobProgress job={job.job} /> : null}
      {items.length ? (
        <div className="grid gap-2">
          <h3 className="text-[16px] font-semibold">{t.exportsList}</h3>
          <ul className="grid gap-2">
            {items.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[var(--border)] p-3">
                <span>
                  <span className="font-semibold">{formatDateTime(e.createdAt)}</span> · {t.exportStatus[e.status]}
                  {e.status === 'ready' && e.expiresAt ? <span className="block text-[13px] text-[var(--text-muted)]">{fmt(t.expiresOn, { date: day(e.expiresAt) })}</span> : null}
                </span>
                {e.status === 'ready' ? <a className="m-btn secondary sm" href={`/api/v1/account/exports/${e.id}/download`}><Download aria-hidden="true" />{t.download}</a> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  )
}

function DeleteSection({ email }: { email: string }) {
  const t = getMessages().app.settings.data
  const c = getMessages().app.common
  const router = useRouter()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['deletion'], queryFn: () => api<Deletion>('/api/v1/account/deletion') })
  const [confirm, setConfirm] = useState('')
  const [open, setOpen] = useState(false)
  const [purgeDate, setPurgeDate] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const del = useMutation({
    mutationFn: () => api<{ purgeAt: string }>('/api/v1/account/deletion', { method: 'POST', json: { confirmEmail: confirm } }),
    onSuccess: () => { setOpen(false); setConfirm(''); void qc.invalidateQueries({ queryKey: ['deletion'] }); router.refresh() },
    onError: () => setOpen(false),
  })
  const keep = useMutation({
    mutationFn: () => api('/api/v1/account/deletion', { method: 'DELETE' }),
    onSuccess: () => { setNotice(t.kept); void qc.invalidateQueries({ queryKey: ['deletion'] }); router.refresh() },
  })
  const err = del.error instanceof ApiClientError ? del.error : null
  const matches = confirm.trim().toLowerCase() === email.toLowerCase()

  if (q.isLoading) return <div className="m-skeleton h-40" aria-hidden="true" />
  const d = q.data
  return (
    <Section title={t.deleteTitle} body={fmt(t.deleteBody, { days: DELETION_GRACE_DAYS })}>
      {notice ? <FormMessage tone="success">{notice}</FormMessage> : null}
      {d?.purgeAt ? (
        <div className="grid gap-3">
          <FormMessage tone="info"><strong>{fmt(t.scheduled, { date: day(d.purgeAt) })}</strong> {t.scheduledBody}</FormMessage>
          <div><button type="button" className="m-btn primary" aria-busy={keep.isPending} disabled={keep.isPending} onClick={() => keep.mutate()}>{t.keep}</button></div>
        </div>
      ) : d?.blockers.length ? (
        <FormMessage tone="info">{fmt(t.deleteBlocked, { workspace: d.blockers[0]!.name })}</FormMessage>
      ) : (
        <form className="grid gap-3 sm:max-w-[420px]" noValidate onSubmit={(e) => { e.preventDefault(); if (matches) { setPurgeDate(new Date(Date.now() + DELETION_GRACE_DAYS * 86_400_000).toISOString()); setOpen(true) } }}>
          <TextInput label={fmt(t.confirmLabel, { email })} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" spellCheck={false} error={err?.fields.confirmEmail} />
          <div><button type="submit" className="m-btn danger" disabled={!matches}>{t.deleteButton}</button></div>
          {err && !err.fields.confirmEmail ? <FormMessage>{err.message}</FormMessage> : null}
        </form>
      )}
      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="drawer-overlay" style={{ zIndex: 'var(--z-modal)' }} />
          <AlertDialog.Content className="m-dialog">
            <AlertDialog.Title className="text-[20px] font-semibold">{t.deleteDialogTitle}</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-[var(--text-muted)]">{fmt(t.deleteDialogBody, { date: purgeDate ? day(purgeDate) : '' })}</AlertDialog.Description>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <AlertDialog.Cancel className="m-btn secondary">{c.cancel}</AlertDialog.Cancel>
              <button type="button" className="m-btn danger" aria-busy={del.isPending} disabled={del.isPending} onClick={() => del.mutate()}>{t.deleteButton}</button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Section>
  )
}
