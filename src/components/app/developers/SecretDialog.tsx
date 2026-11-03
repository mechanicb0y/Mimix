'use client'
import { AlertDialog } from 'radix-ui'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { FormMessage } from '@/components/app/Field'
import { getMessages } from '@/i18n'

/**
 * Shows a secret (API key or signing secret) exactly once. It's an alert dialog so it can't be
 * dismissed by a stray click outside; the person closes it with "I've stored it".
 */
export function SecretDialog({ secret, title, body, copyLabel, onClose }: { secret: string | null; title: string; body: string; copyLabel: string; onClose: () => void }) {
  const t = getMessages().app.developers.keys
  const q = getMessages().developers.quickstart
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copy = async () => {
    if (!secret) return
    try { await navigator.clipboard.writeText(secret); setState('copied') } catch { setState('failed') }
  }
  return (
    <AlertDialog.Root open={!!secret} onOpenChange={(o) => { if (!o) { setState('idle'); onClose() } }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="drawer-overlay" style={{ zIndex: 'var(--z-modal)' }} />
        <AlertDialog.Content className="m-dialog wide">
          <AlertDialog.Title className="text-[20px] font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-[var(--text-muted)]">{body}</AlertDialog.Description>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono text-[13px]" data-testid="secret-value">{secret}</code>
            <button type="button" className="m-btn secondary" onClick={copy}>
              {state === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{state === 'copied' ? t.copied : copyLabel}
            </button>
          </div>
          <div className="mt-2" role="status" aria-live="polite">
            {state === 'failed' ? <FormMessage>{q.copyFailed}</FormMessage> : state === 'copied' ? <span className="sr-only">{t.copied}</span> : null}
          </div>
          <div className="mt-6 flex justify-end">
            <AlertDialog.Action className="m-btn primary">{t.savedIt}</AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
