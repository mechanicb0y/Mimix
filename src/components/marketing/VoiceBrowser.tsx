'use client'
import { Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { AudioPlayer, type PlayerLabels } from '@/components/ui/AudioPlayer'

export interface VoiceCardView {
  id: string; name: string; language: string; accent: string; gender: string; age: string; useCase: string; licence: 'remix' | 'standard'
  labels: { language: string; accent: string; gender: string; age: string; useCase: string; licence: string }
  sample: { src: string; durationMs: number; peaks: number[] }
}
type FilterKey = 'language' | 'accent' | 'gender' | 'age' | 'useCase'
export interface BrowserLabels {
  title: string; search: string; searchPlaceholder: string; any: string; reset: string; results: string; resultsOne: string
  filters: Record<FilterKey, string>; empty: { title: string; body: string; action: string }
}

const KEYS: FilterKey[] = ['language', 'accent', 'gender', 'age', 'useCase']

/** Filterable voice grid. Filters are mirrored in the URL so a filtered view can be shared. */
export function VoiceBrowser({ voices, labels, player }: { voices: VoiceCardView[]; labels: BrowserLabels; player: PlayerLabels }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Record<FilterKey, string>>({ language: '', accent: '', gender: '', age: '', useCase: '' })

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const next = { ...filters }
    for (const k of KEYS) next[k] = p.get(k) ?? ''
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the shared URL
    setFilters(next); setQuery(p.get('q') ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const p = new URLSearchParams()
    for (const k of KEYS) if (filters[k]) p.set(k, filters[k])
    if (query) p.set('q', query)
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [filters, query])

  const options = useMemo(() => Object.fromEntries(KEYS.map((k) => {
    const seen = new Map<string, string>()
    for (const v of voices) seen.set(v[k], v.labels[k])
    return [k, Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]))]
  })) as Record<FilterKey, Array<[string, string]>>, [voices])

  const q = query.trim().toLowerCase()
  const shown = voices.filter((v) => KEYS.every((k) => !filters[k] || v[k] === filters[k])
    && (!q || [v.name, v.labels.accent, v.labels.language, v.labels.useCase, v.labels.gender, v.labels.age].some((s) => s.toLowerCase().includes(q))))
  const active = q !== '' || KEYS.some((k) => filters[k])
  const reset = () => { setFilters({ language: '', accent: '', gender: '', age: '', useCase: '' }); setQuery('') }

  return (
    <div>
      <form role="search" aria-label={labels.title} onSubmit={(e) => e.preventDefault()} className="grid gap-4 rounded-[16px] border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor={`${id}-q`} className="m-label">{labels.search}</label>
          <div className="relative">
            <Search size={18} strokeWidth={1.75} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-subtle" />
            <input id={`${id}-q`} type="search" className="m-input pl-10" placeholder={labels.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        {KEYS.map((k) => (
          <div key={k}>
            <label htmlFor={`${id}-${k}`} className="m-label">{labels.filters[k]}</label>
            <select id={`${id}-${k}`} className="m-select" value={filters[k]} onChange={(e) => setFilters({ ...filters, [k]: e.target.value })}>
              <option value="">{labels.any}</option>
              {options[k].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        ))}
      </form>
      <div className="mt-6 flex items-center justify-between gap-4">
        <p role="status" aria-live="polite" className="text-sm text-text-muted">{shown.length === 1 ? labels.resultsOne : labels.results.replace('{count}', String(shown.length))}</p>
        {active && <button type="button" onClick={reset} className="m-btn ghost sm"><X strokeWidth={1.75} aria-hidden="true" />{labels.reset}</button>}
      </div>
      {shown.length === 0 ? (
        <div className="mt-6 rounded-[16px] border border-dashed border-border-strong p-10 text-center">
          <h2 className="font-display text-xl font-semibold">{labels.empty.title}</h2>
          <p className="mt-2 text-text-muted">{labels.empty.body}</p>
          <button type="button" onClick={reset} className="m-btn secondary mt-6">{labels.empty.action}</button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((v) => (
            <li key={v.id} className="m-card flex flex-col gap-4 p-5" data-voice-card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{v.name}</h2>
                  <p className="text-sm text-text-muted">{v.labels.language} · {v.labels.accent}</p>
                </div>
                <span className={`m-badge ${v.licence === 'remix' ? 'brand' : ''}`}>{v.labels.licence}</span>
              </div>
              <ul className="flex flex-wrap gap-2" aria-label={v.name}>
                {[v.labels.gender, v.labels.age, v.labels.useCase].map((t) => <li key={t} className="m-badge">{t}</li>)}
              </ul>
              <AudioPlayer src={v.sample.src} title={v.name} durationMs={v.sample.durationMs} peaks={v.sample.peaks} labels={player} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
