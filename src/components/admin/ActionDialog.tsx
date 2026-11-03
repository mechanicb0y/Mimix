'use client'
import { useId, useState, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { useRouter } from 'next/navigation'
import { ApiClientError } from '@/lib/api-client'
import { Field, FormMessage } from '@/components/app/Field'
import { useAdminApi } from './admin-api'
import { getMessages } from '@/i18n'

export type ActionField =
  | { name: string; label: string; type: 'text' | 'textarea' | 'number' | 'date'; hint?: string; required?: boolean; defaultValue?: string; placeholder?: string }
  | { name: string; label: string; type: 'select'; options: Array<{ value: string; label: string }>; hint?: string; defaultValue?: string }
  | { name: string; label: string; type: 'checkbox'; hint?: string; defaultChecked?: boolean }
  | { name: string; label: string; type: 'checkboxes'; options: Array<{ value: string; label: string }>; hint?: string; defaultValue?: string[] }

/**
 * A button that opens a small form, sends it to an admin endpoint, and refreshes the page.
 * Every staff action that changes something goes through this, so each one asks for its reason the
 * same way and gets the re-authentication step when the server wants it.
 */
export function ActionDialog({ trigger, title, body, fields = [], reason = true, submitLabel, method = 'POST', path, toJson, tone = 'primary', triggerClass = 'm-btn secondary sm', onDone, disabled }: {
  trigger: ReactNode; title: string; body?: string; fields?: ActionField[]; reason?: boolean; submitLabel: string; method?: string; path: string
  toJson?: (values: Record<string, string>) => unknown; tone?: 'primary' | 'danger'; triggerClass?: string; onDone?: (data: unknown) => void; disabled?: boolean
}) {
  const t = getMessages().admin.common
  const call = useAdminApi()
  const router = useRouter()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<ApiClientError | null>(null)
  const all: ActionField[] = reason ? [...fields, { name: 'reason', label: t.reason, type: 'textarea', hint: t.reasonHint, required: true }] : fields

  async function submit(form: HTMLFormElement) {
    // Several checkboxes with one name arrive as a comma-separated value; a lone checkbox as 'on' or ''.
    const data = new FormData(form)
    const values: Record<string, string> = {}
    for (const f of all) values[f.name] = f.type === 'checkboxes' ? data.getAll(f.name).map(String).join(',') : f.type === 'checkbox' ? (data.get(f.name) ? 'on' : '') : String(data.get(f.name) ?? '')
    setBusy(true); setErr(null)
    try {
      const data = await call(path, { method, json: toJson ? toJson(values) : values })
      setOpen(false)
      onDone?.(data)
      router.refresh()
    } catch (e) {
      setErr(e instanceof ApiClientError ? e : new ApiClientError(0, 'network', getMessages().app.common.networkError))
    } finally { setBusy(false) }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setErr(null) }}>
      <Dialog.Trigger className={triggerClass} disabled={disabled}>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" style={{ zIndex: 'var(--z-modal)' }} />
        <Dialog.Content className="m-dialog max-h-[90dvh] overflow-y-auto" aria-describedby={body ? `${id}-d` : undefined}>
          <Dialog.Title className="text-[20px] font-semibold">{title}</Dialog.Title>
          {body ? <Dialog.Description id={`${id}-d`} className="mt-2 text-[var(--text-muted)]">{body}</Dialog.Description> : null}
          <form className="mt-5 grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); void submit(e.currentTarget) }}>
            {all.map((f) => f.type === 'checkbox' ? (
              <div key={f.name}>
                <label className="flex min-h-11 items-center gap-3 text-[15px]"><input type="checkbox" name={f.name} className="size-5 accent-[var(--primary)]" defaultChecked={f.defaultChecked} />{f.label}</label>
                {f.hint ? <p className="m-hint">{f.hint}</p> : null}
              </div>
            ) : f.type === 'checkboxes' ? (
              <fieldset key={f.name}>
                <legend className="m-label">{f.label}</legend>
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  {f.options.map((o) => <label key={o.value} className="flex min-h-11 items-center gap-2 text-[15px]"><input type="checkbox" name={f.name} value={o.value} className="size-5 accent-[var(--primary)]" defaultChecked={f.defaultValue?.includes(o.value)} />{o.label}</label>)}
                </div>
                {f.hint ? <p className="m-hint">{f.hint}</p> : null}
                {err?.fields[f.name] ? <p className="m-error">{err.fields[f.name]}</p> : null}
              </fieldset>
            ) : (
              <Field key={f.name} label={f.label} hint={f.hint} error={err?.fields[f.name] ?? null}>
                {(p) => f.type === 'select' ? (
                  <select className="m-select" name={f.name} defaultValue={f.defaultValue} {...p}>
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea className="m-textarea" name={f.name} rows={3} required={f.required} defaultValue={f.defaultValue} placeholder={f.placeholder} {...p} />
                ) : (
                  <input className="m-input" name={f.name} type={f.type} inputMode={f.type === 'number' ? 'numeric' : undefined} required={f.required} defaultValue={f.defaultValue} placeholder={f.placeholder} {...p} />
                )}
              </Field>
            ))}
            {err && !Object.keys(err.fields).some((k) => all.some((f) => f.name === k)) ? <FormMessage>{err.message}</FormMessage> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Dialog.Close className="m-btn secondary" type="button">{t.cancel}</Dialog.Close>
              <button type="submit" className={`m-btn ${tone === 'danger' ? 'danger' : 'primary'}`} aria-busy={busy} disabled={busy}>{submitLabel}</button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
