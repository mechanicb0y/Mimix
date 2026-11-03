'use client'
import { Accordion } from 'radix-ui'
import { Plus } from 'lucide-react'

/** One panel open at a time; Radix keeps aria-expanded and aria-controls in sync. */
export function Faq({ items, headingLevel = 3 }: { items: Array<{ q: string; a: string }>; headingLevel?: 2 | 3 }) {
  return (
    <Accordion.Root type="single" collapsible className="border-t border-border">
      {items.map((it, i) => (
        <Accordion.Item key={it.q} value={`q${i}`} className="faq-item">
          <Accordion.Header asChild>
            {headingLevel === 2 ? <h2><Accordion.Trigger className="faq-trigger">{it.q}<Plus strokeWidth={1.75} aria-hidden="true" /></Accordion.Trigger></h2>
              : <h3><Accordion.Trigger className="faq-trigger">{it.q}<Plus strokeWidth={1.75} aria-hidden="true" /></Accordion.Trigger></h3>}
          </Accordion.Header>
          <Accordion.Content className="faq-content">
            <p className="max-w-[68ch] pb-6 text-base">{it.a}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
