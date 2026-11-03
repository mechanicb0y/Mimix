'use client'
import { Tabs } from 'radix-ui'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileJson } from 'lucide-react'
import { getMessages } from '@/i18n'
import { CodeSample, type CodeTab } from '@/components/marketing/CodeSample'
import { KeysPanel } from './KeysPanel'
import { WebhooksPanel } from './WebhooksPanel'
import { UsagePanel } from './UsagePanel'

const TABS = ['keys', 'webhooks', 'usage', 'quickstart'] as const
type Tab = (typeof TABS)[number]

export interface Samples { tts: CodeTab[]; jobs: CodeTab[]; verify: CodeTab[]; base: string }

export function DevelopersHome({ canManage, samples }: { canManage: boolean; samples: Samples }) {
  const t = getMessages().app.developers
  const q = getMessages().developers.quickstart
  const router = useRouter()
  const sp = useSearchParams()
  const fromUrl = sp.get('tab') as Tab | null
  const tab: Tab = fromUrl && TABS.includes(fromUrl) ? fromUrl : canManage ? 'keys' : 'usage'
  const labels = { tabsLabel: q.tabsLabel, copy: q.copy, copied: q.copied, copyFailed: q.copyFailed }

  return (
    <div className="mx-auto grid max-w-[1100px] gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="app-page-title">{t.title}</h1>
          <p className="mt-1 text-[var(--text-muted)]">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/developers" className="m-btn ghost sm">{t.docs}</Link>
          <a href="/api/v1/openapi.json" className="m-btn secondary sm"><FileJson aria-hidden="true" />{t.openapi}</a>
        </div>
      </header>
      <Tabs.Root value={tab} onValueChange={(v) => router.replace(`/app/developers?tab=${v}`, { scroll: false })} className="grid gap-6">
        <Tabs.List aria-label={t.tabsLabel} className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
          {TABS.map((k) => (
            <Tabs.Trigger key={k} value={k} className="relative min-h-11 whitespace-nowrap px-3 text-[14px] font-semibold text-[var(--text-muted)] data-[state=active]:text-[var(--text)] data-[state=active]:after:absolute data-[state=active]:after:inset-x-3 data-[state=active]:after:bottom-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-[var(--primary)]">
              {t.tabs[k]}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="keys" className="outline-none"><KeysPanel canManage={canManage} /></Tabs.Content>
        <Tabs.Content value="webhooks" className="outline-none"><WebhooksPanel canManage={canManage} /></Tabs.Content>
        <Tabs.Content value="usage" className="outline-none"><UsagePanel canListKeys={canManage} /></Tabs.Content>
        <Tabs.Content value="quickstart" className="grid gap-6 outline-none">
          <p className="text-[14px] text-[var(--text-muted)]">{t.quickstart.base}: <code className="font-mono text-[var(--text)]">{samples.base}/v1</code></p>
          <Sample title={t.quickstart.tts} body={t.quickstart.ttsBody} tabs={samples.tts} labels={labels} />
          <Sample title={t.quickstart.jobs} body={t.quickstart.jobsBody} tabs={samples.jobs} labels={labels} />
          <Sample title={t.quickstart.verify} body={t.quickstart.verifyBody} tabs={samples.verify} labels={labels} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}

function Sample({ title, body, tabs, labels }: { title: string; body: string; tabs: CodeTab[]; labels: Parameters<typeof CodeSample>[0]['labels'] }) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-[18px] font-semibold">{title}</h2>
        <p className="mt-1 text-[14px] text-[var(--text-muted)]">{body}</p>
      </div>
      <CodeSample tabs={tabs} labels={labels} />
    </section>
  )
}
