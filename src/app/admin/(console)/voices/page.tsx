import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminPage } from '@/server/admin/guard'
import { consentSearch, listBlocklist, voiceQueue } from '@/server/admin/moderation'
import { PAGE_SIZE } from '@/server/admin/users'
import { BlocklistAdd, BlocklistRemove, PublishDecision } from '@/components/admin/ModerationActions'
import { Empty, FilterForm, FilterInput, PageHeader, Pagination, Section, StateBadge, TabLinks, TableWrap, When, plainParams, withParams } from '@/components/admin/ui'
import { formatNumber, getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: getMessages().admin.nav.voices }

const TABS = ['reports', 'publish', 'consent', 'blocklist'] as const
type Tab = (typeof TABS)[number]

export default async function AdminVoices({ searchParams }: PageProps<'/admin/voices'>) {
  await requireAdminPage('moderateVoices', '/admin/voices')
  const sp = plainParams(await searchParams)
  const a = getMessages().admin
  const t = a.voices
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? '') ? (sp.tab as Tab) : 'reports'
  return (
    <>
      <PageHeader title={t.title} />
      <TabLinks base="/admin/voices" active={tab} label={t.title} tabs={TABS.map((k) => ({ key: k, label: t.tabs[k] }))} />
      {tab === 'reports' || tab === 'publish' ? <Queue tab={tab} /> : tab === 'consent' ? <Consent q={sp.q ?? ''} page={Math.max(1, Number(sp.page) || 1)} /> : <Blocklist />}
    </>
  )
}

async function Queue({ tab }: { tab: 'reports' | 'publish' }) {
  const a = getMessages().admin
  const t = a.voices
  const q = await voiceQueue()
  if (tab === 'reports') {
    return q.reported.length ? (
      <TableWrap label={t.tabs.reports}>
        <table className="app-table">
          <thead><tr><th scope="col">{a.common.name}</th><th scope="col">{t.kind}</th><th scope="col">{a.common.status}</th><th scope="col" className="text-right">{t.reportsCol}</th><th scope="col">{t.reasons}</th><th scope="col">{t.latest}</th></tr></thead>
          <tbody>
            {q.reported.map((r) => (
              <tr key={r.voiceId}>
                <td><Link href={`/admin/voices/${r.voiceId}`} className="font-semibold">{r.voice.name}</Link></td>
                <td>{r.voice.kind}</td>
                <td><StateBadge state={r.voice.status} /></td>
                <td className="text-right tabular-nums">{formatNumber(r.reports)}</td>
                <td>{r.reasons.join(', ')}</td>
                <td><When date={r.latest} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    ) : <Empty />
  }
  return q.pending.length ? (
    <ul className="grid gap-3">
      {q.pending.map(({ voice: v, ownerEmail }) => (
        <li key={v.id} className="m-card flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <Link href={`/admin/voices/${v.id}`} className="font-semibold">{v.name}</Link>
            <p className="text-[14px] text-[var(--text-muted)]">{v.kind} · {ownerEmail ?? '—'} · <When date={v.updatedAt} /></p>
            {v.description ? <p className="mt-1 max-w-[640px] text-[14px]">{v.description}</p> : null}
          </div>
          <PublishDecision voiceId={v.id} />
        </li>
      ))}
    </ul>
  ) : <Empty />
}

async function Consent({ q, page }: { q: string; page: number }) {
  const a = getMessages().admin
  const t = a.voices
  const rows = await consentSearch(q, page)
  const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`)
  return (
    <>
      <FilterForm action="/admin/voices" label={t.tabs.consent}>
        <input type="hidden" name="tab" value="consent" />
        <FilterInput name="q" label={t.consentSearch} defaultValue={q} />
      </FilterForm>
      {rows.length ? (
        <TableWrap label={t.tabs.consent}>
          <table className="app-table">
            <thead><tr><th scope="col">{a.common.when}</th><th scope="col">{a.common.email}</th><th scope="col">{a.common.name}</th><th scope="col">{t.phrase}</th><th scope="col" className="text-right">{t.speakerScore}</th><th scope="col" className="text-right">{t.phraseScore}</th><th scope="col">{t.verified}</th></tr></thead>
            <tbody>
              {rows.map(({ record: r, email, voiceName }) => (
                <tr key={r.id}>
                  <td><When date={r.createdAt} /></td>
                  <td className="break-all">{email}</td>
                  <td>{r.voiceId ? <Link href={`/admin/voices/${r.voiceId}`}>{voiceName ?? r.voiceId}</Link> : '—'}</td>
                  <td className="max-w-[320px]">{r.phrase}</td>
                  <td className="text-right tabular-nums">{pct(r.speakerScore)}</td>
                  <td className="text-right tabular-nums">{pct(r.phraseScore)}</td>
                  <td>{r.verified ? a.common.yes : a.common.no}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : <Empty>{q ? a.common.noResults : undefined}</Empty>}
      <Pagination page={page} hasNext={rows.length === PAGE_SIZE} href={(p) => withParams('/admin/voices', { tab: 'consent', q, page: p })} />
    </>
  )
}

async function Blocklist() {
  const a = getMessages().admin
  const t = a.voices
  const rows = await listBlocklist()
  return (
    <Section title={t.tabs.blocklist} actions={<BlocklistAdd />}>
      {rows.length ? (
        <TableWrap label={t.tabs.blocklist}>
          <table className="app-table">
            <thead><tr><th scope="col">{t.blockName}</th><th scope="col">{t.blockAliases}</th><th scope="col">{t.blockReason}</th><th scope="col"><span className="sr-only">{a.common.actions}</span></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-semibold">{r.name}</td>
                  <td>{(r.aliases as string[] | null)?.join(', ') || '—'}</td>
                  <td>{t.blockReasons[r.reason as keyof typeof t.blockReasons] ?? r.reason}</td>
                  <td className="text-right"><BlocklistRemove id={r.id} name={r.name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : <Empty />}
    </Section>
  )
}
