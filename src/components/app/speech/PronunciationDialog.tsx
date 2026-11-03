'use client'
import { Dialog } from 'radix-ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages, fmt } from '@/i18n'
import { FormMessage, TextInput } from '@/components/app/Field'

interface Rule { id: string; term: string; type: 'alias' | 'ipa'; replacement: string; caseSensitive: boolean }

export function PronunciationDialog({ open, onOpenChange, onCount }: { open: boolean; onOpenChange: (o: boolean) => void; onCount: (n: number) => void }) {
  const t = getMessages().app.speech.dictionary
  const c = getMessages().app.common
  const qc = useQueryClient()
  const rules = useQuery({ queryKey: ['pronunciation'], queryFn: () => api<{ items: Rule[] }>('/api/v1/pronunciation'), enabled: open })
  const [term, setTerm] = useState('')
  const [replacement, setReplacement] = useState('')
  const [type, setType] = useState<'alias' | 'ipa'>('alias')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (rules.data) onCount(rules.data.items.length) }, [rules.data, onCount])

  const add = useMutation({
    mutationFn: (r: Omit<Rule, 'id'>) => api<Rule>('/api/v1/pronunciation', { method: 'POST', json: r }),
    onSuccess: () => { setTerm(''); setReplacement(''); setFields({}); void qc.invalidateQueries({ queryKey: ['pronunciation'] }) },
    onError: (e) => { if (e instanceof ApiClientError) setFields(e.fields) },
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/v1/pronunciation/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pronunciation'] }),
  })

  async function importCsv(file: File) {
    const lines = (await file.text()).split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).slice(0, 500)
    let n = 0
    for (const line of lines) {
      const [term = '', replacement = '', kind = 'alias'] = line.split(',').map((x) => x.trim().replace(/^"|"$/g, ''))
      if (!term || !replacement) continue
      try { await api('/api/v1/pronunciation', { method: 'POST', json: { term, replacement, type: kind === 'ipa' ? 'ipa' : 'alias', caseSensitive: false } }); n++ } catch { /* skip invalid line */ }
    }
    setNotice(fmt(t.imported, { count: n }))
    void qc.invalidateQueries({ queryKey: ['pronunciation'] })
  }

  const err = add.error instanceof ApiClientError && !Object.keys(add.error.fields).length ? add.error.message : null
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" style={{ zIndex: 'var(--z-modal)' }} />
        <Dialog.Content className="m-dialog wide">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-[20px] font-semibold">{t.title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-[14px] text-[var(--text-muted)]">{t.body}</Dialog.Description>
            </div>
            <Dialog.Close className="m-btn ghost icon" aria-label={c.close}><X aria-hidden="true" /></Dialog.Close>
          </div>
          <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate
            onSubmit={(e) => { e.preventDefault(); add.mutate({ term, replacement, type, caseSensitive }) }}>
            <TextInput label={t.term} value={term} onChange={(e) => setTerm(e.target.value)} error={fields.term} maxLength={100} />
            <TextInput label={type === 'ipa' ? t.ipa : t.replacement} value={replacement} onChange={(e) => setReplacement(e.target.value)} error={fields.replacement} maxLength={200} />
            <button type="submit" className="m-btn primary" aria-busy={add.isPending} disabled={add.isPending || !term.trim() || !replacement.trim()}>{t.add}</button>
            <div className="flex flex-wrap gap-4 sm:col-span-3">
              <label className="flex items-center gap-2 text-[14px]"><input type="radio" name="pr-type" checked={type === 'alias'} onChange={() => setType('alias')} className="size-4 accent-[var(--primary)]" />{t.alias}</label>
              <label className="flex items-center gap-2 text-[14px]"><input type="radio" name="pr-type" checked={type === 'ipa'} onChange={() => setType('ipa')} className="size-4 accent-[var(--primary)]" />{t.ipa}</label>
              <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} className="size-4 accent-[var(--primary)]" />{t.caseSensitive}</label>
            </div>
          </form>
          <div className="mt-2"><FormMessage>{err}</FormMessage>{notice ? <FormMessage tone="success">{notice}</FormMessage> : null}</div>
          <div className="mt-4 flex items-center gap-3">
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="sr-only" id="pr-import" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = '' }} />
            <label htmlFor="pr-import" className="m-btn secondary sm cursor-pointer"><Upload aria-hidden="true" />{t.import}</label>
            <span className="text-[13px] text-[var(--text-subtle)]">{t.importHint}</span>
          </div>
          <div className="mt-4 overflow-x-auto relative" tabIndex={0} role="region" aria-label={t.title}>
            {rules.isLoading ? <div className="m-skeleton h-24" aria-hidden="true" /> : !rules.data?.items.length ? <p className="app-empty">{t.empty}</p> : (
              <table className="app-table">
                <thead><tr><th scope="col">{t.term}</th><th scope="col">{t.replacement}</th><th scope="col">{t.type}</th><th scope="col"><span className="sr-only">{c.more}</span></th></tr></thead>
                <tbody>
                  {rules.data.items.map((r) => (
                    <tr key={r.id}>
                      <td className="font-semibold">{r.term}</td><td>{r.replacement}</td><td>{r.type === 'ipa' ? t.ipa : t.alias}</td>
                      <td className="text-right"><button type="button" className="m-btn ghost icon sm" aria-label={fmt(t.remove, { term: r.term })} onClick={() => remove.mutate(r.id)}><Trash2 aria-hidden="true" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
