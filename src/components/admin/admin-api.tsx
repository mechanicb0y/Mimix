'use client'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { useRouter } from 'next/navigation'
import { api, ApiClientError } from '@/lib/api-client'
import { authClient } from '@/lib/auth-client'
import { FormMessage, PasswordInput, TextInput } from '@/components/app/Field'
import { getMessages } from '@/i18n'

type Pending = { resolve: (ok: boolean) => void; locked: boolean }
const Ctx = createContext<{ call: <T>(path: string, init?: RequestInit & { json?: unknown }) => Promise<T> } | null>(null)

/**
 * Admin API calls with the re-authentication step built in: when the server answers
 * 428 reauth_required (destructive action) or 423 admin_locked (idle), this asks for the password
 * (and a 2FA code), then repeats the call once.
 */
export function AdminApiProvider({ children, twoFactor }: { children: ReactNode; twoFactor: boolean }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const ref = useRef<Pending | null>(null)
  const ask = (locked: boolean) => new Promise<boolean>((resolve) => { const p = { resolve, locked }; ref.current = p; setPending(p) })
  const call = useCallback(async <T,>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> => {
    try {
      return await api<T>(path, init)
    } catch (e) {
      if (e instanceof ApiClientError && (e.code === 'reauth_required' || e.code === 'admin_locked')) {
        if (await ask(e.code === 'admin_locked')) return api<T>(path, init)
      }
      throw e
    }
  }, [])
  const close = (ok: boolean) => { ref.current?.resolve(ok); ref.current = null; setPending(null) }
  return (
    <Ctx.Provider value={{ call }}>
      {children}
      <ReauthDialog open={!!pending} locked={!!pending?.locked} twoFactor={twoFactor} onDone={close} />
    </Ctx.Provider>
  )
}

export function useAdminApi() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAdminApi outside AdminApiProvider')
  return c.call
}

export function ReauthForm({ twoFactor, locked, onDone, onCancel }: { twoFactor: boolean; locked?: boolean; onDone: () => void; onCancel?: () => void }) {
  const t = getMessages().admin.reauth
  const c = getMessages().app.auth
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<ApiClientError | null>(null)
  return (
    <form className="grid gap-4" noValidate onSubmit={async (e) => {
      e.preventDefault()
      setBusy(true); setErr(null)
      try { await api('/api/admin/reauth', { method: 'POST', json: { password, ...(twoFactor ? { code } : {}) } }); onDone() }
      catch (x) { setErr(x instanceof ApiClientError ? x : new ApiClientError(0, 'network', getMessages().app.common.networkError)) }
      finally { setBusy(false) }
    }}>
      <PasswordInput label={t.password} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required
        error={err?.fields.password ?? null} showLabel={c.showPassword} hideLabel={c.hidePassword} />
      {twoFactor ? <TextInput label={t.code} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} error={err?.fields.code ?? null} /> : null}
      {err && !err.fields.password && !err.fields.code ? <FormMessage>{err.message}</FormMessage> : null}
      <div className="flex flex-wrap justify-end gap-2">
        {locked ? (
          <button type="button" className="m-btn ghost" onClick={async () => { await authClient.signOut(); router.replace('/sign-in') }}>{t.signOut}</button>
        ) : onCancel ? <button type="button" className="m-btn secondary" onClick={onCancel}>{getMessages().admin.common.cancel}</button> : null}
        <button type="submit" className="m-btn primary" aria-busy={busy} disabled={busy || !password}>{t.submit}</button>
      </div>
    </form>
  )
}

function ReauthDialog({ open, locked, twoFactor, onDone }: { open: boolean; locked: boolean; twoFactor: boolean; onDone: (ok: boolean) => void }) {
  const t = getMessages().admin.reauth
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onDone(false) }}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" style={{ zIndex: 'var(--z-modal)' }} />
        <Dialog.Content className="m-dialog">
          <Dialog.Title className="text-[20px] font-semibold">{locked ? t.lockedTitle : t.title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-[var(--text-muted)]">{locked ? t.lockedBody : t.body}</Dialog.Description>
          <div className="mt-5">{open ? <ReauthForm twoFactor={twoFactor} onDone={() => onDone(true)} onCancel={() => onDone(false)} /> : null}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
