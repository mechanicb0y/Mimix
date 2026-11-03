'use client'
import { AlertDialog } from 'radix-ui'
import { useState, type ReactNode } from 'react'
import { getMessages } from '@/i18n'

/** A button that asks before doing something that can't be undone. */
export function ConfirmButton({ children, title, body, confirmLabel, onConfirm, className = 'm-btn ghost sm', ariaLabel, disabled }: {
  children: ReactNode; title: string; body?: string; confirmLabel?: string; onConfirm: () => void | Promise<void>; className?: string; ariaLabel?: string; disabled?: boolean
}) {
  const c = getMessages().app.common
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger className={className} aria-label={ariaLabel} disabled={disabled}>{children}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="drawer-overlay" style={{ zIndex: 'var(--z-modal)' }} />
        <AlertDialog.Content className="m-dialog">
          <AlertDialog.Title className="text-[20px] font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-[var(--text-muted)]">{body ?? c.cannotUndo}</AlertDialog.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel className="m-btn secondary">{c.cancel}</AlertDialog.Cancel>
            <button type="button" className="m-btn danger" aria-busy={busy} disabled={busy}
              onClick={async () => { setBusy(true); try { await onConfirm(); setOpen(false) } finally { setBusy(false) } }}>
              {confirmLabel ?? c.delete}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
