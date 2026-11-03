'use client'
import { Tabs } from 'radix-ui'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

export interface CodeTab { id: string; label: string; code: string }

/** Tabbed code samples with a copy button that reports success or failure to screen readers. */
export function CodeSample({ tabs, labels }: { tabs: CodeTab[]; labels: { tabsLabel: string; copy: string; copied: string; copyFailed: string } }) {
  const [active, setActive] = useState(tabs[0]?.id ?? '')
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copy = async () => {
    const code = tabs.find((t) => t.id === active)?.code ?? ''
    try { await navigator.clipboard.writeText(code); setState('copied') } catch { setState('failed') }
    setTimeout(() => setState('idle'), 2000)
  }
  return (
    <Tabs.Root value={active} onValueChange={setActive} className="overflow-hidden rounded-[16px] border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-2">
        <Tabs.List aria-label={labels.tabsLabel} className="relative flex overflow-x-auto">
          {tabs.map((t) => (
            <Tabs.Trigger key={t.id} value={t.id} className="relative min-h-[44px] px-3 text-sm font-semibold text-text-muted data-[state=active]:text-text data-[state=active]:after:absolute data-[state=active]:after:inset-x-3 data-[state=active]:after:bottom-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary">
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <button type="button" onClick={copy} className="m-btn ghost sm" aria-label={state === 'copied' ? labels.copied : labels.copy}>
          {state === 'copied' ? <Check strokeWidth={1.75} aria-hidden="true" /> : <Copy strokeWidth={1.75} aria-hidden="true" />}
          <span className="hidden sm:inline">{state === 'copied' ? labels.copied : labels.copy}</span>
        </button>
      </div>
      {tabs.map((t) => (
        <Tabs.Content key={t.id} value={t.id} className="focus-visible:shadow-none">
          <pre className="relative overflow-x-auto p-4 font-mono text-[13px] leading-[20px] text-text" tabIndex={0} aria-label={t.label}><code>{t.code}</code></pre>
        </Tabs.Content>
      ))}
      <p role="status" aria-live="polite" className="sr-only">{state === 'copied' ? labels.copied : state === 'failed' ? labels.copyFailed : ''}</p>
    </Tabs.Root>
  )
}
