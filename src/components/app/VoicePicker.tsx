'use client'
import { useQuery } from '@tanstack/react-query'
import { Popover } from 'radix-ui'
import { Check, ChevronDown, Pause, Play, Search } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api-client'
import { getMessages } from '@/i18n'
import type { VoiceView } from '@/server/modules/voices'

export interface VoiceOption { id: string; name: string; kind: string; language: string; accent: string; gender: string; licence: string; previewUrl: string; owned: boolean; library: boolean; mixable?: boolean }

/** Voices the workspace can use: its own, saved ones and the Mimix library. */
export function useUsableVoices(filter?: (v: VoiceOption) => boolean) {
  return useQuery({
    queryKey: ['voices', 'usable'],
    queryFn: async () => {
      const [mine, lib] = await Promise.all([
        api<{ own: VoiceView[]; saved: VoiceView[] }>('/api/v1/voices'),
        api<{ items: VoiceView[] }>('/api/v1/library?sort=name'),
      ])
      const own = mine.own.filter((v) => v.status === 'active')
      const seen = new Set(own.map((v) => v.id))
      const rest = [...mine.saved, ...lib.items.filter((v) => v.library)].filter((v) => !seen.has(v.id) && seen.add(v.id))
      return { own, others: rest }
    },
    select: (d) => filter ? { own: d.own.filter(filter), others: d.others.filter(filter) } : d,
  })
}

let currentAudio: HTMLAudioElement | null = null

export function PreviewButton({ voice, label }: { voice: Pick<VoiceOption, 'id' | 'name' | 'previewUrl'>; label?: string }) {
  const t = getMessages().app.common
  const [playing, setPlaying] = useState(false)
  const ref = useRef<HTMLAudioElement | null>(null)
  return (
    <button type="button" className="m-btn ghost icon sm" aria-pressed={playing} aria-label={`${playing ? t.stop : t.preview} ${label ?? voice.name}`}
      onClick={(e) => {
        e.stopPropagation()
        if (playing) { ref.current?.pause(); setPlaying(false); return }
        currentAudio?.pause()
        const a = ref.current ?? new Audio(voice.previewUrl)
        ref.current = a; currentAudio = a
        a.onended = a.onpause = () => setPlaying(false)
        a.currentTime = 0
        void a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
      }}>
      {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
    </button>
  )
}

/** A searchable listbox in a popover. Arrow keys move, Enter picks, Escape closes. */
export function VoicePicker({ value, onChange, label, id, error, filter }: { value: string | null; onChange: (id: string, v: VoiceOption) => void; label: string; id?: string; error?: string | null; filter?: (v: VoiceOption) => boolean }) {
  const t = getMessages().app
  const { data, isLoading, isError, refetch } = useUsableVoices(filter)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const all = useMemo(() => [...(data?.own ?? []), ...(data?.others ?? [])], [data])
  const selected = all.find((v) => v.id === value)
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    return n ? all.filter((v) => `${v.name} ${v.accent} ${v.language} ${v.gender}`.toLowerCase().includes(n)) : all
  }, [all, q])
  const listId = `${id ?? 'voice'}-list`
  const pick = (v: VoiceOption) => { onChange(v.id, v); setOpen(false); setQ('') }

  return (
    <div>
      <label className="m-label" htmlFor={id}>{label}</label>
      <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (o) setActive(Math.max(0, filtered.findIndex((v) => v.id === value))) }}>
        <Popover.Trigger id={id} className="m-select flex items-center justify-between text-left" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined}>
          <span className="truncate">{selected ? `${selected.name}` : isLoading ? t.common.loading : t.voicePicker.placeholder}</span>
          <ChevronDown aria-hidden="true" size={16} className="sr-only" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="app-menu w-[var(--radix-popover-trigger-width)] min-w-[280px] p-2" sideOffset={6} align="start"
            onOpenAutoFocus={(e) => { e.preventDefault(); (document.getElementById(`${listId}-q`) as HTMLInputElement | null)?.focus() }}>
            <div className="relative mb-2">
              <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
              <input id={`${listId}-q`} className="m-input pl-9" placeholder={t.voicePicker.search} aria-label={t.voicePicker.search} value={q}
                role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={filtered[active] ? `${listId}-${filtered[active]!.id}` : undefined}
                onChange={(e) => { setQ(e.target.value); setActive(0) }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)) }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
                  if (e.key === 'Enter' && filtered[active]) { e.preventDefault(); pick(filtered[active]!) }
                }} />
            </div>
            {isError ? <div className="p-3 text-[14px]">{t.common.networkError} <button type="button" className="link" onClick={() => refetch()}>{t.common.retry}</button></div> : null}
            <ul id={listId} role="listbox" aria-label={label} className="max-h-[320px] overflow-y-auto">
              {filtered.length === 0 && !isLoading ? <li className="p-3 text-[14px] text-[var(--text-muted)]">{t.voicePicker.noMatch}</li> : null}
              {filtered.map((v, i) => (
                <li key={v.id} id={`${listId}-${v.id}`} role="option" aria-selected={v.id === value}
                  className={`flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 ${i === active ? 'bg-[var(--surface-2)]' : ''}`}
                  onMouseEnter={() => setActive(i)} onClick={() => pick(v)}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{v.name}{v.owned ? <span className="m-badge ml-2 h-5">{t.voicePicker.yours}</span> : null}</span>
                    <span className="block truncate text-[12px] text-[var(--text-muted)]">{[t.voicePicker.kinds[v.kind as keyof typeof t.voicePicker.kinds], v.accent, v.language.toUpperCase()].filter(Boolean).join(' · ')}</span>
                  </span>
                  {v.id === value ? <Check aria-hidden="true" size={16} /> : null}
                  <PreviewButton voice={v} />
                </li>
              ))}
            </ul>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {error ? <p id={`${id}-err`} className="m-error">{error}</p> : null}
    </div>
  )
}
