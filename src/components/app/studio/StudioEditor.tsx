'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowDown, ArrowLeft, ArrowUp, Download, FileUp, Pause, Play, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useEffect, useId, useRef, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { useJob } from '@/lib/use-job'
import { getMessages, fmt, formatNumber, plural } from '@/i18n'
import { NARRATOR, STUDIO_BLOCK_MAX, STUDIO_TITLE_MAX } from '@/lib/schemas/studio'
import { FormMessage, TextArea, TextInput } from '@/components/app/Field'
import { VoicePicker } from '@/components/app/VoicePicker'
import { OverQuota } from '@/components/app/OverQuota'
import { JobProgress } from '@/components/app/JobProgress'
import { formatTime } from '@/components/ui/AudioPlayer'
import { useAppContext } from '@/components/app/shell/context'

interface Block { id: string; chapterId: string; position: number; text: string; speaker: string | null; voiceId: string | null; effectiveVoiceId: string | null; status: 'empty' | 'ready' | 'stale'; audioUrl: string | null }
interface ExportView { generationId: string; createdAt: string; durationMs: number | null; audioUrl: string; downloadUrl: string }
interface Chapter { id: string; title: string; position: number; blocks: Block[]; export: ExportView | null }
interface Project {
  id: string; title: string; kind: 'audiobook' | 'podcast'; defaultVoiceId: string | null; cast: Record<string, string>; speakers: string[]
  characters: number; maxCharacters: number; staleCharacters: number; exportJobId: string | null; chapters: Chapter[]; fullExport: ExportView | null
}

const t = () => getMessages().app.studio

/** One shared audio element, so playing a block stops the previous one. */
function usePlayer() {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  useEffect(() => () => ref.current?.pause(), [])
  return {
    playing,
    toggle(id: string, url: string) {
      ref.current ??= new Audio()
      const a = ref.current
      if (playing === id) { a.pause(); setPlaying(null); return }
      a.src = url
      a.onended = () => setPlaying(null)
      void a.play().then(() => setPlaying(id)).catch(() => setPlaying(null))
    },
  }
}

export function StudioEditor({ id, canEdit }: { id: string; canEdit: boolean }) {
  const s = t()
  const c = getMessages().app.common
  const qc = useQueryClient()
  const router = useRouter()
  const ctx = useAppContext()
  const key = ['studio', id]
  const q = useQuery({ queryKey: key, queryFn: () => api<Project>(`/api/v1/studio/projects/${id}`) })
  const p = q.data
  const set = (d: Project) => qc.setQueryData(key, d)
  const refresh = () => qc.invalidateQueries({ queryKey: key })
  const [chapterId, setChapterId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const player = usePlayer()
  const job = useJob(() => { void refresh(); router.refresh() })
  const following = job.job?.id
  const exportJobId = p?.exportJobId ?? null
  const startJob = job.start
  useEffect(() => { if (exportJobId && exportJobId !== following) startJob(exportJobId) }, [exportJobId, following, startJob])

  const exp = useMutation({
    mutationFn: (chapter?: string) => api<{ id: string }>(`/api/v1/studio/projects/${id}/export`, { method: 'POST', json: chapter ? { chapterId: chapter } : {} }),
    onSuccess: (j) => job.start(j.id),
  })
  const addChapter = useMutation({
    mutationFn: () => api<Project>(`/api/v1/studio/projects/${id}/chapters`, { method: 'POST', json: { title: s.newChapterTitle } }),
    onSuccess: (d) => { set(d); setChapterId(d.chapters.at(-1)!.id) },
  })
  const del = useMutation({ mutationFn: () => api(`/api/v1/studio/projects/${id}`, { method: 'DELETE' }), onSuccess: () => router.push('/app/studio') })

  const back = <Link href="/app/studio" className="m-btn ghost sm justify-self-start"><ArrowLeft aria-hidden="true" />{s.back}</Link>
  if (q.isLoading) return <div className="mx-auto grid max-w-[1200px] gap-4">{back}<div className="m-skeleton h-40" aria-hidden="true" /></div>
  if (q.isError || !p) {
    const notFound = q.error instanceof ApiClientError && q.error.status === 404
    return <div className="mx-auto grid max-w-[1200px] gap-4">{back}<FormMessage>{notFound ? s.notFound : <>{c.networkError} <button type="button" className="link" onClick={() => q.refetch()}>{c.retry}</button></>}</FormMessage></div>
  }
  const chapter = p.chapters.find((x) => x.id === chapterId) ?? p.chapters[0]!
  const busy = job.active || !!p.exportJobId
  const exportErr = exp.error instanceof ApiClientError ? exp.error : null
  const notEnough = !ctx.balance.unlimited && p.staleCharacters > ctx.balance.total
  const editable = canEdit && !busy

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      {back}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="app-page-title break-words">{p.title}</h1>
          <p className="mt-1 text-[var(--text-muted)]">{s.kinds[p.kind]} · {fmt(s.usage, { count: formatNumber(p.characters), max: formatNumber(p.maxCharacters) })}</p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="m-btn secondary" onClick={() => setImportOpen(true)} disabled={busy}><FileUp aria-hidden="true" />{s.import}</button>
            <button type="button" className="m-btn primary" onClick={() => exp.mutate(undefined)} disabled={busy || exp.isPending || notEnough || !p.characters}>
              <Download aria-hidden="true" />{busy ? s.exporting : s.exportAll}
            </button>
          </div>
        ) : null}
      </header>
      {canEdit && p.characters ? <p className="-mt-4 text-[13px] text-[var(--text-muted)]">{p.staleCharacters ? fmt(s.exportCost, { credits: plural(p.staleCharacters, c.creditsOne, c.credits) }) : s.exportFree}</p> : null}
      {notEnough ? <OverQuota needed={p.staleCharacters} available={ctx.balance.total} /> : null}
      {exportErr?.code === 'insufficient_credits' ? <OverQuota needed={Number(exportErr.extra.needed)} available={Number(exportErr.extra.available)} /> : exportErr ? <FormMessage>{exportErr.message}</FormMessage> : null}
      <JobProgress job={job.job} onCancel={job.cancel} />
      {p.fullExport ? (
        <div className="m-card flex flex-wrap items-center gap-3 p-4">
          <span className="flex-1 text-[14px]">{fmt(s.lastExport, { date: new Date(p.fullExport.createdAt).toLocaleString(), duration: formatTime((p.fullExport.durationMs ?? 0) / 1000) })}</span>
          <a className="m-btn secondary sm" href={p.fullExport.downloadUrl} download><Download aria-hidden="true" />{s.downloadAll}</a>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)_280px]">
        <nav aria-label={s.chapters} className="grid content-start gap-2">
          <h2 className="m-label">{s.chapters}</h2>
          <ol className="grid gap-1">
            {p.chapters.map((ch) => (
              <li key={ch.id}>
                <button type="button" className={`w-full truncate rounded-[var(--radius-md)] px-3 py-2 text-left text-[14px] ${ch.id === chapter.id ? 'bg-[var(--surface-2)] font-semibold' : 'hover:bg-[var(--surface-2)]'}`}
                  aria-current={ch.id === chapter.id ? 'true' : undefined} onClick={() => setChapterId(ch.id)}>{ch.title}</button>
              </li>
            ))}
          </ol>
          {editable ? <button type="button" className="m-btn ghost sm justify-self-start" onClick={() => addChapter.mutate()} disabled={addChapter.isPending}><Plus aria-hidden="true" />{s.addChapter}</button> : null}
        </nav>

        <ChapterEditor key={chapter.id} p={p} chapter={chapter} editable={editable} canEdit={canEdit} busy={busy} set={set} player={player} onExport={() => exp.mutate(chapter.id)} onDeleted={(d) => { set(d); setChapterId(null) }} />

        <aside className="grid content-start gap-4 lg:col-start-2 xl:col-start-auto">
          <CastPanel key={JSON.stringify([p.cast, p.defaultVoiceId, p.speakers])} p={p} editable={editable} set={set} />
          {canEdit ? (
            <button type="button" className="m-btn ghost justify-self-start text-[var(--danger)]" disabled={busy || del.isPending} onClick={() => { if (window.confirm(s.deleteConfirm)) del.mutate() }}>
              <Trash2 aria-hidden="true" />{s.deleteProject}
            </button>
          ) : null}
        </aside>
      </div>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} projectId={id} onDone={(d) => { set(d); setChapterId(null); setImportOpen(false) }} />
    </div>
  )
}

function ChapterEditor({ p, chapter, editable, canEdit, busy, set, player, onExport, onDeleted }: {
  p: Project; chapter: Chapter; editable: boolean; canEdit: boolean; busy: boolean; set: (d: Project) => void; player: ReturnType<typeof usePlayer>; onExport: () => void; onDeleted: (d: Project) => void
}) {
  const s = t()
  const uid = useId()
  const qc = useQueryClient()
  const [title, setTitle] = useState(chapter.title)
  const idx = p.chapters.findIndex((x) => x.id === chapter.id)
  const patch = useMutation({ mutationFn: (json: Record<string, unknown>) => api<Project>(`/api/v1/studio/chapters/${chapter.id}`, { method: 'PATCH', json }), onSuccess: set })
  const del = useMutation({ mutationFn: () => api<Project>(`/api/v1/studio/chapters/${chapter.id}`, { method: 'DELETE' }), onSuccess: onDeleted })
  const add = useMutation({
    mutationFn: (afterId?: string) => api<Block>('/api/v1/studio/blocks', { method: 'POST', json: { chapterId: chapter.id, afterId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studio', p.id] }),
  })
  const fieldErr = patch.error instanceof ApiClientError ? patch.error.fields.title : undefined

  return (
    <section className="grid min-w-0 content-start gap-4" aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`} className="sr-only">{chapter.title}</h2>
      <div className="m-card grid gap-3 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <TextInput label={s.chapterTitle} value={title} maxLength={STUDIO_TITLE_MAX} readOnly={!editable} error={fieldErr}
              onChange={(e) => setTitle(e.target.value)} onBlur={() => { if (title.trim() && title !== chapter.title) patch.mutate({ title }) }} />
          </div>
          {editable ? (
            <div className="flex gap-1">
              <button type="button" className="m-btn ghost icon" aria-label={fmt(s.moveUp, { title: chapter.title })} disabled={idx === 0} onClick={() => patch.mutate({ move: 'up' })}><ArrowUp aria-hidden="true" /></button>
              <button type="button" className="m-btn ghost icon" aria-label={fmt(s.moveDown, { title: chapter.title })} disabled={idx === p.chapters.length - 1} onClick={() => patch.mutate({ move: 'down' })}><ArrowDown aria-hidden="true" /></button>
              <button type="button" className="m-btn ghost icon text-[var(--danger)]" aria-label={s.deleteChapter} disabled={p.chapters.length <= 1}
                onClick={() => { if (window.confirm(fmt(s.deleteChapterConfirm, { title: chapter.title }))) del.mutate() }}><Trash2 aria-hidden="true" /></button>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? <button type="button" className="m-btn secondary sm" onClick={onExport} disabled={busy || !chapter.blocks.some((b) => b.text.trim())}><Download aria-hidden="true" />{s.exportChapter}</button> : null}
          {chapter.export ? (
            <>
              <a className="m-btn ghost sm" href={chapter.export.downloadUrl} download><Download aria-hidden="true" />{s.downloadChapter}</a>
              <span className="text-[12px] text-[var(--text-subtle)]">{fmt(s.lastExport, { date: new Date(chapter.export.createdAt).toLocaleString(), duration: formatTime((chapter.export.durationMs ?? 0) / 1000) })}</span>
            </>
          ) : null}
        </div>
        {del.error ? <FormMessage>{del.error.message}</FormMessage> : null}
      </div>
      {!chapter.blocks.length ? <p className="app-empty">{s.emptyChapter}</p> : (
        <ol className="grid gap-3">
          {chapter.blocks.map((b, i) => <BlockEditor key={b.id} p={p} b={b} n={i + 1} editable={editable} player={player} onAddBelow={() => add.mutate(b.id)} />)}
        </ol>
      )}
      {editable ? <button type="button" className="m-btn secondary justify-self-start" onClick={() => add.mutate(chapter.blocks.at(-1)?.id)} disabled={add.isPending}><Plus aria-hidden="true" />{s.addBlockEnd}</button> : null}
    </section>
  )
}

function BlockEditor({ p, b, n, editable, player, onAddBelow }: { p: Project; b: Block; n: number; editable: boolean; player: ReturnType<typeof usePlayer>; onAddBelow: () => void }) {
  const s = t()
  const c = getMessages().app.common
  const uid = useId()
  const qc = useQueryClient()
  const key = ['studio', p.id]
  const [text, setText] = useState(b.text)
  const [savedText, setSavedText] = useState(b.text)
  const refresh = () => qc.invalidateQueries({ queryKey: key })
  const patch = useMutation({
    mutationFn: (json: Record<string, unknown>) => api<Block>(`/api/v1/studio/blocks/${b.id}`, { method: 'PATCH', json }),
    onSuccess: (nb) => { setSavedText(nb.text); void refresh() },
  })
  const gen = useMutation({ mutationFn: () => api<Block>(`/api/v1/studio/blocks/${b.id}/generate`, { method: 'POST' }), onSuccess: (nb) => { void refresh(); if (nb.audioUrl) player.toggle(b.id, nb.audioUrl) } })
  const del = useMutation({ mutationFn: () => api(`/api/v1/studio/blocks/${b.id}`, { method: 'DELETE' }), onSuccess: refresh })
  const err = patch.error instanceof ApiClientError ? patch.error : null
  const genErr = gen.error instanceof ApiClientError ? gen.error : null
  const speakers = p.speakers
  const save = () => { if (text !== savedText) patch.mutate({ text }) }
  const status = b.status === 'ready' && text === savedText ? s.statusReady : b.status === 'empty' ? null : s.statusStale

  return (
    <li className="m-card grid gap-2 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-[var(--text-subtle)]">{fmt(s.block, { n })}</span>
        <label className="sr-only" htmlFor={`${uid}-spk`}>{s.speaker}</label>
        <select id={`${uid}-spk`} className="m-select h-9 w-auto min-w-[120px] max-w-[180px] text-[13px]" value={b.speaker ?? ''} disabled={!editable}
          onChange={(e) => {
            let v: string | null = e.target.value || null
            if (v === '__new') { v = window.prompt(s.newSpeakerPrompt)?.trim().slice(0, 40) || null; if (!v) return }
            patch.mutate({ speaker: v })
          }}>
          <option value="">{s.narrator}</option>
          {speakers.filter((x) => x !== NARRATOR).map((x) => <option key={x} value={x}>{x}</option>)}
          <option value="__new">{s.newSpeaker}</option>
        </select>
        {status ? <span className={`m-badge ${status === s.statusReady ? '' : 'text-[var(--warning,var(--text-muted))]'}`}>{status}</span> : null}
        <span className="ml-auto flex items-center gap-1">
        {b.status === 'ready' && b.audioUrl && text === savedText ? (
          <button type="button" className="m-btn ghost sm" onClick={() => player.toggle(b.id, b.audioUrl!)} aria-label={player.playing === b.id ? s.stopBlock : fmt(s.playBlock, { n })}>
            {player.playing === b.id ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
        ) : editable && text.trim() ? (
          <button type="button" className="m-btn secondary sm" disabled={gen.isPending || patch.isPending || text !== savedText} aria-busy={gen.isPending} onClick={() => gen.mutate()}>
            <Sparkles aria-hidden="true" />{gen.isPending ? s.voicing : fmt(s.voiceBlock, { credits: plural(b.text.length, c.creditsOne, c.credits) })}
          </button>
        ) : null}
        {editable ? (
          <>
            <button type="button" className="m-btn ghost icon sm" aria-label={s.addBlock} onClick={onAddBelow}><Plus aria-hidden="true" /></button>
            <button type="button" className="m-btn ghost icon sm" aria-label={fmt(s.deleteBlock, { n })} onClick={() => del.mutate()}><Trash2 aria-hidden="true" /></button>
          </>
        ) : null}
        </span>
      </div>
      <TextArea className="m-textarea min-h-[64px]" label={<span className="sr-only">{fmt(s.block, { n })}</span>} value={text} rows={Math.min(8, Math.max(2, Math.ceil(text.length / 90)))} maxLength={STUDIO_BLOCK_MAX} readOnly={!editable}
        onChange={(e) => setText(e.target.value)} onBlur={save} error={err?.fields.text} />
      <p className="sr-only" role="status" aria-live="polite">{patch.isPending ? s.saving : patch.isSuccess ? s.saved : ''}</p>
      {err && !Object.keys(err.fields).length ? <FormMessage>{err.message}</FormMessage> : null}
      {genErr?.code === 'insufficient_credits' ? <OverQuota needed={Number(genErr.extra.needed)} available={Number(genErr.extra.available)} /> : genErr ? <FormMessage>{genErr.message}</FormMessage> : null}
    </li>
  )
}

function CastPanel({ p, editable, set }: { p: Project; editable: boolean; set: (d: Project) => void }) {
  const s = t()
  const uid = useId()
  const patch = useMutation({ mutationFn: (json: Record<string, unknown>) => api<Project>(`/api/v1/studio/projects/${p.id}`, { method: 'PATCH', json }), onSuccess: set })
  const fields = patch.error instanceof ApiClientError ? patch.error.fields : {}
  return (
    <section className="m-card grid gap-3 p-4" aria-labelledby={`${uid}-cast`}>
      <h2 id={`${uid}-cast`} className="text-[16px] font-semibold">{s.cast}</h2>
      <p className="m-hint -mt-1">{s.castHint}</p>
      <VoicePicker id={`${uid}-def`} label={s.defaultVoice} value={p.defaultVoiceId} onChange={(v) => editable && patch.mutate({ defaultVoiceId: v })} error={fields.defaultVoiceId} />
      {p.speakers.map((sp) => (
        <VoicePicker key={sp} id={`${uid}-${sp.replace(/\W+/g, '')}`} label={fmt(s.voiceFor, { speaker: sp })} value={p.cast[sp] ?? p.defaultVoiceId}
          onChange={(v) => editable && patch.mutate({ cast: { [sp]: v } })} error={fields[`cast.${sp}`]} />
      ))}
      {patch.error && !Object.keys(fields).length ? <FormMessage>{patch.error.message}</FormMessage> : null}
    </section>
  )
}

function ImportDialog({ open, onOpenChange, projectId, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string; onDone: (p: Project) => void }) {
  const s = t()
  const c = getMessages().app.common
  const uid = useId()
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const run = useMutation({ mutationFn: () => api<Project>(`/api/v1/studio/projects/${projectId}/import`, { method: 'POST', json: { text, mode } }), onSuccess: (d) => { setText(''); onDone(d) } })
  const err = run.error instanceof ApiClientError ? run.error : null
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" style={{ zIndex: 'var(--z-modal)' }} />
        <Dialog.Content className="m-dialog wide">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-[20px] font-semibold">{s.importTitle}</Dialog.Title>
              <Dialog.Description className="mt-1 text-[14px] text-[var(--text-muted)]">{s.importBody}</Dialog.Description>
            </div>
            <Dialog.Close className="m-btn ghost icon" aria-label={c.close}><X aria-hidden="true" /></Dialog.Close>
          </div>
          <form className="mt-4 grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); run.mutate() }}>
            <input id={`${uid}-file`} type="file" accept=".txt,.md,text/plain,text/markdown" className="sr-only"
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); e.target.value = '' }} />
            <label htmlFor={`${uid}-file`} className="m-btn secondary sm cursor-pointer justify-self-start"><FileUp aria-hidden="true" />{s.importFile}</label>
            <TextArea label={s.importText} value={text} onChange={(e) => setText(e.target.value)} rows={10} error={err?.fields.text} />
            <fieldset className="flex flex-wrap gap-4">
              <legend className="sr-only">{s.import}</legend>
              <label className="flex items-center gap-2 text-[14px]"><input type="radio" name={`${uid}-mode`} className="size-4 accent-[var(--primary)]" checked={mode === 'append'} onChange={() => setMode('append')} />{s.importAppend}</label>
              <label className="flex items-center gap-2 text-[14px]"><input type="radio" name={`${uid}-mode`} className="size-4 accent-[var(--primary)]" checked={mode === 'replace'} onChange={() => setMode('replace')} />{s.importReplace}</label>
            </fieldset>
            {err && !Object.keys(err.fields).length ? <FormMessage>{err.message}</FormMessage> : null}
            <button type="submit" className="m-btn primary justify-self-start" disabled={!text.trim() || run.isPending} aria-busy={run.isPending}>{run.isPending ? s.importing : s.importRun}</button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
