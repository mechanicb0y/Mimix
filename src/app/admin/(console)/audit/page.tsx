import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminPage } from '@/server/admin/guard'
import { searchAudit } from '@/server/admin/platform'
import { PAGE_SIZE } from '@/server/admin/users'
import { Empty, FilterCheck, FilterForm, FilterInput, PageHeader, Pagination, TableWrap, When, plainParams, withParams } from '@/components/admin/ui'
import { getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: getMessages().admin.nav.audit }

function short(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = JSON.stringify(v)
  return s.length > 160 ? `${s.slice(0, 157)}…` : s
}

export default async function AdminAudit({ searchParams }: PageProps<'/admin/audit'>) {
  await requireAdminPage('viewAudit', '/admin/audit')
  const sp = plainParams(await searchParams)
  const a = getMessages().admin
  const t = a.audit
  const { rows, page, filters } = await searchAudit(sp)
  const params = { actor: filters.actor, action: filters.action, target: filters.target, from: filters.from, to: filters.to, staff: filters.staff }
  return (
    <>
      <PageHeader title={t.title} body={t.body} actions={
        <a className="m-btn secondary sm" href={withParams('/api/admin/audit/export', params)} download>{t.export}</a>
      } />
      <FilterForm action="/admin/audit" label={t.title}>
        <FilterInput name="actor" label={t.actorLabel} defaultValue={filters.actor} className="min-w-[200px] flex-1" />
        <FilterInput name="action" label={t.actionLabel} defaultValue={filters.action} className="min-w-[160px]" />
        <FilterInput name="target" label={t.target} defaultValue={filters.target} className="min-w-[160px]" />
        <FilterInput name="from" label={t.from} type="date" defaultValue={filters.from} className="min-w-[150px]" />
        <FilterInput name="to" label={t.to} type="date" defaultValue={filters.to} className="min-w-[150px]" />
        <FilterCheck name="staff" label={t.staffOnly} checked={!!filters.staff} />
      </FilterForm>
      <p className="mb-3 text-[13px] text-[var(--text-subtle)]">{t.exportHint}</p>
      {rows.length ? (
        <TableWrap label={t.title}>
          <table className="app-table">
            <thead><tr><th scope="col">{a.common.when}</th><th scope="col">{t.actor}</th><th scope="col">{t.action}</th><th scope="col">{a.generations.target}</th><th scope="col">{a.common.reason}</th><th scope="col">{t.before} → {t.after}</th><th scope="col">{a.users.ip}</th></tr></thead>
            <tbody>
              {rows.map(({ entry: r, email }) => (
                <tr key={r.id}>
                  <td><When date={r.createdAt} /></td>
                  <td className="break-all">{r.actorId ? <Link href={`/admin/users/${r.actorId}`}>{email ?? r.actorId}</Link> : t.system}{r.actorRole ? <div className="text-[12px] text-[var(--text-subtle)]">{a.roles[r.actorRole as keyof typeof a.roles] ?? r.actorRole}</div> : null}</td>
                  <td><code className="text-[13px]">{r.action}</code></td>
                  <td className="text-[13px]">{r.targetType ? <>{r.targetType}<div className="break-all text-[var(--text-subtle)]">{r.targetId}</div></> : '—'}</td>
                  <td className="max-w-[240px] break-words text-[13px]">{r.reason ?? ''}</td>
                  <td className="max-w-[320px] break-all font-mono text-[12px] text-[var(--text-muted)]">{short(r.before)}{r.before && r.after ? ' → ' : ''}{short(r.after)}</td>
                  <td className="text-[13px]">{r.ipAddress ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : <Empty>{a.common.noResults}</Empty>}
      <Pagination page={page} hasNext={rows.length === PAGE_SIZE} href={(p) => withParams('/admin/audit', { ...params, page: p })} />
    </>
  )
}
