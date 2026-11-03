'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages, fmt } from '@/i18n'
import { FORM_LANGUAGES, languageName } from '@/config/languages'
import { AGES, GENDERS, LICENCES, USE_CASES } from '@/lib/schemas/voices'
import { FormMessage, TextArea, TextInput } from '@/components/app/Field'
import { ConfirmButton } from '@/components/app/Confirm'
import { PreviewButton } from '@/components/app/VoicePicker'
import type { VoiceItem } from './VoiceCard'

interface Detail extends VoiceItem { lineage: Array<{ id: string; name: string; status: string; weight: number }> }
interface ConsentRow { id: string; method: 'recording' | 'attest'; phrase: string; recordedAt: string; verified: boolean; speakerScore: number | null; phraseScore: number | null; audioSha256: string | null }

export function VoiceDetail({ id: voiceId, canManage }: { id: string; canManage: boolean }) {
  const t = getMessages().app.voiceDetail
  const c = getMessages().app.common
  const mv = getMessages().app.myVoices
  const lib = getMessages().library.values
  const mx = getMessages().app.mixer
  const router = useRouter()
  const qc = useQueryClient()
  const id = useId()
  const q = useQuery({ queryKey: ['voice', voiceId], queryFn: () => api<Detail>(`/api/v1/voices/${voiceId}`) })
  const v = q.data
  const isClone = v?.kind === 'instant_clone' || v?.kind === 'professional_clone'
  const consent = useQuery({ queryKey: ['voice', voiceId, 'consent'], queryFn: () => api<{ items: ConsentRow[] }>(`/api/v1/voices/${voiceId}/consent`), enabled: !!v?.owned && isClone })
  const [form, setForm] = useState<Partial<VoiceItem> | null>(null)
  const f = { ...v, ...form } as VoiceItem
  const set = (k: keyof VoiceItem, val: string) => setForm((x) => ({ ...x, [k]: val }))
  const refresh = () => { setForm(null); void qc.invalidateQueries({ queryKey: ['voice', voiceId] }); void qc.invalidateQueries({ queryKey: ['voices'] }) }

  const save = useMutation({
    mutationFn: () => api(`/api/v1/voices/${voiceId}`, { method: 'PATCH', json: form }),
    onSuccess: refresh,
  })
  const pub = useMutation({
    mutationFn: (on: boolean) => api(`/api/v1/voices/${voiceId}/publish`, { method: on ? 'POST' : 'DELETE' }),
    onSuccess: refresh,
  })
  const [deleted, setDeleted] = useState('')
  const del = async () => {
    const r = await api<{ affectedMixes: number }>(`/api/v1/voices/${voiceId}`, { method: 'DELETE' })
    setDeleted(r.affectedMixes ? fmt(t.deletedMixes, { count: r.affectedMixes }) : t.deleted)
    void qc.invalidateQueries({ queryKey: ['voices'] })
    setTimeout(() => router.push('/app/voices'), 1200)
  }
  const sErr = save.error instanceof ApiClientError ? save.error : null
  const pErr = pub.error instanceof ApiClientError ? pub.error : null

  if (q.isLoading) return <div className="mx-auto grid max-w-[880px] gap-4" aria-hidden="true"><div className="m-skeleton h-10 w-60" /><div className="m-skeleton h-64" /></div>
  if (q.isError || !v) return <div className="mx-auto max-w-[880px]"><FormMessage>{t.notFound} <Link href="/app/voices" className="link">{t.back}</Link></FormMessage></div>

  const select = (k: 'gender' | 'age' | 'useCase', opts: readonly string[], label: string) => (
    <div>
      <label htmlFor={`${id}-${k}`} className="m-label">{label}</label>
      <select id={`${id}-${k}`} className="m-select" value={f[k]} onChange={(e) => set(k, e.target.value)} disabled={!v.owned || !canManage}>
        {opts.map((o) => <option key={o} value={o}>{(lib[k] as Record<string, string>)[o] ?? o}</option>)}
      </select>
    </div>
  )

  return (
    <div className="mx-auto grid max-w-[880px] gap-6">
      <Link href="/app/voices" className="m-btn ghost sm justify-self-start"><ArrowLeft aria-hidden="true" />{t.back}</Link>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="app-page-title">{v.name}</h1>
        {v.status === 'active' ? <PreviewButton voice={v} /> : null}
        <span className="m-badge">{(getMessages().app.voicePicker.kinds as Record<string, string>)[v.kind]}</span>
        <span className="m-badge">{(mv.status as Record<string, string>)[v.status]}</span>
      </header>
      {deleted ? <FormMessage tone="success">{deleted}</FormMessage> : null}
      {!v.owned ? <FormMessage tone="info">{t.readOnly} <Link href={`/report?type=voice&id=${encodeURIComponent(v.id)}`} className="link">{getMessages().app.safety.reportVoice}</Link></FormMessage> : null}
      {v.status === 'pending_consent' ? <FormMessage tone="info"><Link href={`/app/voices/clone?voice=${v.id}`} className="link">{mv.finishConsent}</Link></FormMessage> : null}

      <form className="m-card grid gap-4 p-4 sm:p-6" noValidate onSubmit={(e) => { e.preventDefault(); save.mutate() }} aria-labelledby={`${id}-details`}>
        <h2 id={`${id}-details`} className="text-[18px] font-semibold">{t.details}</h2>
        <TextInput label={t.name} value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={60} disabled={!v.owned || !canManage} error={sErr?.fields.name} />
        <TextArea label={t.description} hint={t.descriptionHint} value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={500} rows={3} disabled={!v.owned || !canManage} error={sErr?.fields.description ?? pErr?.fields.description} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-lang`} className="m-label">{t.language}</label>
            <select id={`${id}-lang`} className="m-select" value={f.language} onChange={(e) => set('language', e.target.value)} disabled={!v.owned || !canManage}>
              {[...new Set([f.language, ...FORM_LANGUAGES])].map((l) => <option key={l} value={l}>{languageName(l)}</option>)}
            </select>
          </div>
          <TextInput label={t.accent} value={f.accent} onChange={(e) => set('accent', e.target.value)} maxLength={40} disabled={!v.owned || !canManage} />
          {select('gender', GENDERS, t.gender)}
          {select('age', AGES, t.age)}
          {select('useCase', USE_CASES, t.useCase)}
          <div>
            <label htmlFor={`${id}-lic`} className="m-label">{t.licence}</label>
            <select id={`${id}-lic`} className="m-select" value={f.licence} onChange={(e) => set('licence', e.target.value)} disabled={!v.owned || !canManage} aria-describedby={sErr?.fields.licence ? `${id}-lic-err` : undefined}>
              {LICENCES.map((l) => <option key={l} value={l}>{mx.licences[l]}</option>)}
            </select>
            {sErr?.fields.licence ? <p id={`${id}-lic-err`} className="m-error">{sErr.fields.licence}</p> : null}
          </div>
        </div>
        {sErr && !Object.keys(sErr.fields).length ? <FormMessage>{sErr.message}</FormMessage> : null}
        {save.isSuccess && !form ? <p className="text-[14px]" role="status">{t.saved}</p> : null}
        {v.owned && canManage ? <button type="submit" className="m-btn primary justify-self-start" disabled={!form || save.isPending} aria-busy={save.isPending}>{save.isPending ? c.saving : c.save}</button> : null}
      </form>

      {v.owned ? (
        <section className="m-card grid gap-3 p-4 sm:p-6" aria-labelledby={`${id}-lib`}>
          <h2 id={`${id}-lib`} className="text-[18px] font-semibold">{t.library}</h2>
          <p className="text-[14px] text-[var(--text-muted)]">{t.libraryBody}</p>
          <p className="text-[14px] font-semibold">{mv.publish[v.publishStatus]}</p>
          {v.publishStatus === 'rejected' && v.publishNote ? <p className="text-[14px]">{fmt(t.rejectedNote, { note: v.publishNote })}</p> : null}
          {pErr && !pErr.fields.description ? <FormMessage>{pErr.message}</FormMessage> : null}
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              {v.publishStatus === 'none' || v.publishStatus === 'rejected' ? <button type="button" className="m-btn secondary sm" disabled={pub.isPending || v.status !== 'active'} onClick={() => pub.mutate(true)}>{t.publish}</button> : null}
              {v.publishStatus === 'pending' ? <button type="button" className="m-btn ghost sm" disabled={pub.isPending} onClick={() => pub.mutate(false)}>{t.withdraw}</button> : null}
              {v.publishStatus === 'approved' ? <button type="button" className="m-btn ghost sm" disabled={pub.isPending} onClick={() => pub.mutate(false)}>{t.unpublish}</button> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {v.lineage.length ? (
        <section className="m-card grid gap-3 p-4 sm:p-6" aria-labelledby={`${id}-lin`}>
          <h2 id={`${id}-lin`} className="text-[18px] font-semibold">{t.lineage}</h2>
          <p className="text-[14px] text-[var(--text-muted)]">{t.lineageBody}</p>
          <ul className="grid gap-1">
            {v.lineage.map((l) => <li key={l.id} className="flex justify-between gap-3 text-[14px]"><span>{l.name}{l.status !== 'active' ? ` (${(mv.status as Record<string, string>)[l.status]})` : ''}</span><span>{Math.round(l.weight * 100)}%</span></li>)}
          </ul>
        </section>
      ) : null}

      {v.owned && isClone ? (
        <section className="m-card grid gap-3 p-4 sm:p-6" aria-labelledby={`${id}-cons`}>
          <h2 id={`${id}-cons`} className="text-[18px] font-semibold">{t.consent}</h2>
          <p className="text-[14px] text-[var(--text-muted)]">{t.consentBody}</p>
          {consent.isLoading ? <div className="m-skeleton h-16" aria-hidden="true" /> : !consent.data?.items.length ? <p className="app-empty">{t.consentEmpty}</p> : (
            <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label={t.consent}>
              <table className="app-table">
                <thead><tr><th scope="col">{t.consentWhen}</th><th scope="col">{t.consentPhrase}</th><th scope="col">{t.consentHash}</th></tr></thead>
                <tbody>
                  {consent.data.items.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">{new Date(r.recordedAt).toLocaleString()}<br /><span className="font-semibold">{r.method === 'attest' ? t.consentAttested : r.verified ? t.consentVerified : t.consentFailed}</span></td>
                      <td>{r.phrase}</td>
                      <td className="font-mono text-[12px] break-all">{r.audioSha256 ?? <span className="font-sans text-[var(--text-muted)]">{t.noRecording}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {v.owned && canManage ? (
        <section className="m-card grid gap-3 border-[var(--danger)] p-4 sm:p-6" aria-labelledby={`${id}-del`}>
          <h2 id={`${id}-del`} className="text-[18px] font-semibold">{t.delete}</h2>
          <p className="text-[14px] text-[var(--text-muted)]">{t.deleteBody}</p>
          <ConfirmButton className="m-btn danger sm justify-self-start" title={t.delete} body={t.deleteBody} onConfirm={del}><Trash2 aria-hidden="true" />{t.delete}</ConfirmButton>
        </section>
      ) : null}
    </div>
  )
}
