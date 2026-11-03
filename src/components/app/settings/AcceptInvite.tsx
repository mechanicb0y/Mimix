'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages, fmt } from '@/i18n'
import { FormMessage } from '@/components/app/Field'

export function AcceptInvite({ token, workspace }: { token: string; workspace: string }) {
  const t = getMessages().app.settings.invite
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const accept = async () => {
    setBusy(true); setMsg(null)
    try {
      await api('/api/v1/team/invites/accept', { method: 'POST', json: { token } })
      setMsg({ tone: 'success', text: fmt(t.accepted, { workspace }) })
      router.push('/app'); router.refresh()
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof ApiClientError ? e.message : getMessages().app.common.networkError })
      setBusy(false)
    }
  }
  return (
    <div className="mt-6 grid gap-3">
      <button type="button" className="m-btn primary lg w-full" aria-busy={busy} disabled={busy} onClick={accept}>{t.accept}</button>
      <div aria-live="polite">{msg ? <FormMessage tone={msg.tone}>{msg.text}</FormMessage> : null}</div>
    </div>
  )
}
