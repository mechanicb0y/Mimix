import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminPage } from '@/server/admin/guard'
import { openReportList, searchGenerations } from '@/server/admin/moderation'
import { PAGE_SIZE } from '@/server/admin/users'
import { JOB_STATUSES, MODULES } from '@/server/db/schema'
import { adminCan } from '@/config/admin'
import { ReportDecision } from '@/components/admin/ModerationActions'
import { Empty, FilterCheck, FilterForm, FilterInput, FilterSelect, PageHeader, Pagination, StateBadge, TabLinks, TableWrap, When, moduleLabel, plainParams, withParams } from '@/components/admin/ui'
import { formatNumber, getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: getMessages().admin.nav.generations }

export default async function AdminGenerations({ searchParams }: PageProps<'/admin/generations'>) {
  const actor = await requireAdminPage('viewGenerations', '/admin/generations')
  const sp = plainParams(await searchParams)
  const a = getMessages().admin
  const t = a.generations
  const tab = sp.tab === 'reports' ? 'reports' : 'log'
  return (
    <>
      <PageHeader title={t.title} />
      <TabLinks base="/admin/generations" active={tab} label={t.title} tabs={[{ key: 'log', label: t.tabs.log }, { key: 'reports', label: t.tabs.reports }]} />
      {tab === 'log' ? <Log sp={sp} /> : <Reports canModerate={adminCan(actor.role, 'moderateGenerations')} />}
    </>
  )
}

async function Log({ sp }: { sp: Record<string, string> }) {
  const a = getMessages().admin
  const t = a.generations
  const { rows, page, filters } = await searchGenerations(sp)
  const href = (p: number) => withParams('/admin/generations', { q: filters.q, module: filters.module, status: filters.status, flagged: filters.flagged, page: p })
  return (
    <>
      <FilterForm action="/admin/generations" label={t.tabs.log}>
        <FilterInput name="q" label={t.searchLabel} defaultValue={filters.q} />
        <FilterSelect name="module" label={t.module} value={filters.module} options={MODULES.map((m) => ({ value: m, label: moduleLabel(m) }))} />
        <FilterSelect name="status" label={a.common.status} value={filters.status} options={JOB_STATUSES.map((s) => ({ value: s, label: s }))} />
        <FilterCheck name="flagged" label={t.flaggedOnly} checked={!!filters.flagged} />
      </FilterForm>
      {rows.length ? (
        <TableWrap label={t.tabs.log}>
          <table className="app-table">
            <thead><tr><th scope="col">{a.common.when}</th><th scope="col">{t.module}</th><th scope="col">{a.common.status}</th><th scope="col">{a.common.email}</th><th scope="col">{t.text}</th><th scope="col" className="text-right">{a.common.credits}</th><th scope="col">{t.via}</th></tr></thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id}>
                  <td><Link href={`/admin/generations/${g.id}`}><When date={g.createdAt} /></Link>{g.flagged ? <> <StateBadge state="pending" label={t.flagged} /></> : null}</td>
                  <td>{moduleLabel(g.module)}</td>
                  <td><StateBadge state={g.status} /></td>
                  <td className="break-all">{g.email ?? '—'}</td>
                  <td className="max-w-[360px] truncate" title={g.text ?? undefined}>{g.text ?? '—'}</td>
                  <td className="text-right tabular-nums">{formatNumber(g.credits)}</td>
                  <td>{g.apiKeyId ? t.viaApi : t.viaApp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : <Empty>{a.common.noResults}</Empty>}
      <Pagination page={page} hasNext={rows.length === PAGE_SIZE} href={href} />
    </>
  )
}

async function Reports({ canModerate }: { canModerate: boolean }) {
  const a = getMessages().admin
  const t = a.generations
  const rows = await openReportList()
  const targetHref = (type: string, id: string) => type === 'voice' ? `/admin/voices/${id}` : type === 'user' ? `/admin/users/${id}` : `/admin/generations/${id}`
  return rows.length ? (
    <TableWrap label={t.tabs.reports}>
      <table className="app-table">
        <thead><tr><th scope="col">{a.common.when}</th><th scope="col">{t.target}</th><th scope="col">{t.report}</th><th scope="col">{t.reporter}</th><th scope="col"><span className="sr-only">{a.common.actions}</span></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><When date={r.createdAt} /></td>
              <td><Link href={targetHref(r.targetType, r.targetId)}>{r.targetType} <code className="text-[12px]">{r.targetId}</code></Link></td>
              <td className="max-w-[420px]"><strong>{r.reason}</strong>{r.details ? <p className="text-[14px] text-[var(--text-muted)]">{r.details}</p> : null}</td>
              <td className="break-all">{r.reporterEmail ?? t.anonymous}</td>
              <td>{canModerate ? <ReportDecision reportId={r.id} /> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  ) : <Empty />
}
