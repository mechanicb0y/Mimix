import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminPage } from '@/server/admin/guard'
import { PAGE_SIZE, searchUsers } from '@/server/admin/users'
import { ROLES, USER_STATUSES } from '@/server/db/schema'
import { Empty, FilterForm, FilterInput, FilterSelect, PageHeader, Pagination, StateBadge, TableWrap, When, planLabel, plainParams, withParams } from '@/components/admin/ui'
import { fmt, formatNumber, getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: getMessages().admin.nav.users }

export default async function AdminUsers({ searchParams }: PageProps<'/admin/users'>) {
  await requireAdminPage('viewUsers', '/admin/users')
  const sp = plainParams(await searchParams)
  const a = getMessages().admin
  const t = a.users
  const { rows, total, page, filters } = await searchUsers(sp)
  const href = (p: number) => withParams('/admin/users', { q: filters.q, role: filters.role, status: filters.status, page: p })
  return (
    <>
      <PageHeader title={t.title} body={fmt(t.total, { count: formatNumber(total) })} />
      <FilterForm action="/admin/users" label={t.title}>
        <FilterInput name="q" label={t.searchLabel} defaultValue={filters.q} />
        <FilterSelect name="role" label={t.roleFilter} value={filters.role} options={ROLES.map((r) => ({ value: r, label: a.roles[r] }))} />
        <FilterSelect name="status" label={t.statusFilter} value={filters.status} options={USER_STATUSES.map((s) => ({ value: s, label: a.statuses[s] }))} />
      </FilterForm>
      {rows.length ? (
        <TableWrap label={t.title}>
          <table className="app-table">
            <thead><tr>
              <th scope="col">{a.common.email}</th><th scope="col">{a.common.role}</th><th scope="col">{a.common.status}</th>
              <th scope="col">{a.common.plan}</th><th scope="col">{t.twoFactor}</th><th scope="col">{t.joined}</th>
            </tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="max-w-[320px]"><Link href={`/admin/users/${u.id}`} className="font-semibold break-all">{u.email}</Link><div className="text-[13px] text-[var(--text-muted)]">{u.name}</div></td>
                  <td>{a.roles[u.role]}</td>
                  <td><StateBadge state={u.status} label={a.statuses[u.status]} /></td>
                  <td>{planLabel(u.planId)}</td>
                  <td>{u.twoFactorEnabled ? a.common.yes : a.common.no}</td>
                  <td><When date={u.createdAt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : <Empty>{a.common.noResults}</Empty>}
      <Pagination page={page} hasNext={page * PAGE_SIZE < total} href={href} />
    </>
  )
}
