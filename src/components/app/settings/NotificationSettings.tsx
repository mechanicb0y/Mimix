'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Switch } from 'radix-ui'
import { useId } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages } from '@/i18n'
import { FormMessage } from '@/components/app/Field'
import { Section } from './Section'

type Prefs = { jobEmails: boolean; lowCreditEmails: boolean; billingEmails: boolean; productEmails: boolean }
const KEYS = ['jobEmails', 'lowCreditEmails', 'billingEmails', 'productEmails'] as const

/** Each switch saves on change; a status line confirms it. */
export function NotificationSettings() {
  const t = getMessages().app.settings.notifications
  const c = getMessages().app.common
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['prefs'], queryFn: () => api<Prefs>('/api/v1/account/notifications') })
  const save = useMutation({
    mutationFn: (patch: Partial<Prefs>) => api<Prefs>('/api/v1/account/notifications', { method: 'PATCH', json: patch }),
    onSuccess: (p) => qc.setQueryData(['prefs'], p),
  })
  return (
    <Section title={t.title} body={t.body}>
      {q.isLoading ? <div className="m-skeleton h-40" aria-hidden="true" /> : q.isError || !q.data ? <FormMessage>{c.networkError}</FormMessage> : (
        <ul className="grid divide-y divide-[var(--border)]">
          {KEYS.map((k) => <PrefRow key={k} label={t[k].label} hint={t[k].hint} checked={q.data[k]} disabled={save.isPending} onChange={(v) => save.mutate({ [k]: v })} />)}
        </ul>
      )}
      <div role="status" aria-live="polite">
        {save.isSuccess ? <FormMessage tone="success">{t.saved}</FormMessage> : null}
      </div>
      {save.error ? <FormMessage>{save.error instanceof ApiClientError ? save.error.message : c.networkError}</FormMessage> : null}
    </Section>
  )
}

function PrefRow({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="font-semibold">{label}</label>
        <p id={`${id}-h`} className="text-[13px] text-[var(--text-muted)]">{hint}</p>
      </div>
      <Switch.Root id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} aria-describedby={`${id}-h`}
        className="relative h-7 w-12 flex-none pointer-coarse:h-11 pointer-coarse:w-[72px] rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] transition-colors data-[state=checked]:border-transparent data-[state=checked]:bg-[var(--primary)] disabled:opacity-60">
        <Switch.Thumb className="block size-5 translate-x-[3px] rounded-full bg-[var(--text)] transition-transform data-[state=checked]:translate-x-[23px] pointer-coarse:size-9 pointer-coarse:data-[state=checked]:translate-x-[31px] data-[state=checked]:bg-[var(--on-primary)]" />
      </Switch.Root>
    </li>
  )
}
