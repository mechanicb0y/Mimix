'use client'
import { Search } from 'lucide-react'
import { useId, useState } from 'react'
import { Faq } from '@/components/ui/Faq'

interface Topic { id: string; title: string; items: Array<{ q: string; a: string }> }

/** Client-side search over help answers, then topics as accordions. */
export function HelpSearch({ topics, labels }: { topics: Topic[]; labels: { label: string; placeholder: string; results: string; resultsOne: string; empty: string; topicsTitle: string } }) {
  const id = useId()
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const words = term.split(/\s+/).filter(Boolean)
  const hits = term ? topics.flatMap((t) => t.items).filter((it) => words.every((w) => `${it.q} ${it.a}`.toLowerCase().includes(w))) : []
  return (
    <div>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="mx-auto max-w-[640px]">
        <label htmlFor={id} className="sr-only">{labels.label}</label>
        <div className="relative">
          <Search size={20} strokeWidth={1.75} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-subtle" />
          <input id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.placeholder} className="m-input h-14 pl-12 text-lg" aria-describedby={`${id}-status`} />
        </div>
        <p id={`${id}-status`} role="status" aria-live="polite" className="mt-2 min-h-[20px] text-sm text-text-muted">
          {term ? (hits.length === 0 ? labels.empty.replace('{query}', q.trim()) : hits.length === 1 ? labels.resultsOne : labels.results.replace('{count}', String(hits.length))) : ''}
        </p>
      </form>
      {term ? (
        hits.length > 0 && <div className="mx-auto mt-6 max-w-[800px]"><Faq items={hits} /></div>
      ) : (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold">{labels.topicsTitle}</h2>
          <div className="mt-8 grid gap-10 lg:grid-cols-2">
            {topics.map((t) => (
              <section key={t.id} aria-labelledby={`${id}-${t.id}`} id={t.id}>
                <h3 id={`${id}-${t.id}`} className="mb-2 font-display text-xl font-semibold">{t.title}</h3>
                <Faq items={t.items} headingLevel={3} />
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
