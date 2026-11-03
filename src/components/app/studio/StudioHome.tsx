'use client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Lock, Mic } from 'lucide-react'
import { useId, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages, fmt, formatNumber } from '@/i18n'
import { STUDIO_TITLE_MAX } from '@/lib/schemas/studio'
import { FormMessage, TextInput } from '@/components/app/Field'
import { VoicePicker } from '@/components/app/VoicePicker'

interface Item { id: string; title: string; kind: 'audiobook' | 'podcast'; chapters: number; characters: number; updatedAt: string }

export function StudioHome({ canGenerate, canStudio }: { canGenerate: boolean; canStudio: boolean }) {
  const t = getMessages().app.studio
  const c = getMessages().app.common
  const id = useId()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'audiobook' | 'podcast'>('audiobook')
  const [voice, setVoice] = useState<string | null>('lib_wren')
  const list = useQuery({ queryKey: ['studio'], queryFn: () => api<{ items: Item[] }>('/api/v1/studio/projects') })
  const create = useMutation({
    mutationFn: () => api<{ id: string }>('/api/v1/studio/projects', { method: 'POST', json: { title, kind, defaultVoiceId: voice } }),
    onSuccess: (p) => router.push(`/app/studio/${p.id}`),
  })
  const err = create.error instanceof ApiClientError ? create.error : null

  return (
    <div className="mx-auto grid max-w-[1100px] gap-6">
      <header>
        <h1 className="app-page-title">{t.title}</h1>
        <p className="mt-1 text-[var(--text-muted)]">{t.subtitle}</p>
      </header>
      {!canGenerate ? <FormMessage tone="info">{c.viewerReadOnly}</FormMessage>
        : !canStudio ? (
          <div className="m-card flex flex-wrap items-center gap-3 p-4 sm:p-6">
            <Lock aria-hidden="true" className="size-5 text-[var(--text-muted)]" />
            <p className="flex-1">{t.locked}</p>
            <Link href="/app/settings/billing" className="m-btn primary">{t.seePlans}</Link>
          </div>
        ) : (
          <form className="m-card grid gap-4 p-4 sm:p-6" noValidate aria-labelledby={`${id}-new`} onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
            <h2 id={`${id}-new`} className="text-[18px] font-semibold">{t.newTitle}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label={t.projectTitle} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={STUDIO_TITLE_MAX} required error={err?.fields.title} />
              <VoicePicker id={`${id}-voice`} label={t.defaultVoice} value={voice} onChange={(v) => setVoice(v)} error={err?.fields.defaultVoiceId} />
            </div>
            <fieldset>
              <legend className="m-label">{t.kind}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['audiobook', 'podcast'] as const).map((k) => (
                  <label key={k} className={`grid cursor-pointer gap-1 rounded-[var(--radius-lg)] border p-4 ${kind === k ? 'border-[var(--primary)] bg-[var(--surface-2)]' : 'border-[var(--border)]'}`}>
                    <span className="flex items-center gap-2 font-semibold">
                      <input type="radio" name={`${id}-kind`} className="size-4 accent-[var(--primary)]" checked={kind === k} onChange={() => setKind(k)} />
                      {k === 'audiobook' ? <BookOpen size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}{t.kinds[k]}
                    </span>
                    <span className="text-[13px] text-[var(--text-muted)]">{t.kindHints[k]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {err && !Object.keys(err.fields).length ? <FormMessage>{err.message}</FormMessage> : null}
            <button type="submit" className="m-btn primary justify-self-start" disabled={!title.trim() || !voice || create.isPending} aria-busy={create.isPending}>{create.isPending ? t.creating : t.create}</button>
          </form>
        )}
      <section aria-labelledby={`${id}-list`} className="grid gap-3">
        <h2 id={`${id}-list`} className="text-[20px] font-semibold">{t.list}</h2>
        {list.isLoading ? <div className="m-skeleton h-16" aria-hidden="true" />
          : list.isError ? <FormMessage>{c.networkError} <button type="button" className="link" onClick={() => list.refetch()}>{c.retry}</button></FormMessage>
          : !list.data?.items.length ? <p className="app-empty">{t.empty}</p>
          : (
            <ul className="grid gap-2">
              {list.data.items.map((p) => (
                <li key={p.id} className="m-card p-4">
                  <Link href={`/app/studio/${p.id}`} className="block truncate font-semibold hover:underline">{p.title}</Link>
                  <p className="text-[13px] text-[var(--text-muted)]">
                    {fmt(t.item, { kind: t.kinds[p.kind], chapters: p.chapters === 1 ? t.chaptersOne : fmt(t.chaptersN, { count: p.chapters }), characters: formatNumber(p.characters), date: new Date(p.updatedAt).toLocaleString() })}
                  </p>
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  )
}
