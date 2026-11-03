import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/server/admin/guard'
import { viewAsSnapshot } from '@/server/admin/users'
import { Empty, Notice, PageHeader, Section, StateBadge, TableWrap, When, moduleLabel, planLabel } from '@/components/admin/ui'
import { fmt, formatNumber, getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: getMessages().admin.users.viewAs }

/** Read-only "view as user": what their app shows, without signing in as them. Each visit is audited. */
export default async function AdminViewAs({ params }: PageProps<'/admin/users/[id]/view'>) {
  const { id } = await params
  const actor = await requireAdminPage('viewAsUser', `/admin/users/${id}/view`)
  const d = await viewAsSnapshot(id, actor)
  if (!d) notFound()
  const a = getMessages().admin
  const t = a.users
  return (
    <>
      <p className="mb-2 text-[14px]"><Link href={`/admin/users/${id}`}>{d.user.email}</Link></p>
      <PageHeader title={fmt(t.viewAsTitle, { name: d.user.name || d.user.email })} />
      <Notice>{t.viewAsBanner}</Notice>
      <dl className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {d.workspaces.map((w) => (
          <div key={w.workspace.id} className="m-card p-4">
            <dt className="text-[13px] text-[var(--text-muted)]">{w.workspace.name} · {planLabel(w.workspace.planId)}</dt>
            <dd className="mt-1 text-[24px] font-semibold tabular-nums">{w.balance.unlimited ? a.common.unlimited : formatNumber(w.balance.total)}</dd>
            <dd className="text-[12px] text-[var(--text-subtle)]">{a.common.credits}</dd>
          </div>
        ))}
      </dl>
      <Section title={t.recentGenerations}>
        {d.generations.length ? (
          <TableWrap label={t.recentGenerations}>
            <table className="app-table">
              <thead><tr><th scope="col">{a.common.when}</th><th scope="col">{t.module}</th><th scope="col">{a.common.status}</th><th scope="col" className="text-right">{a.common.credits}</th></tr></thead>
              <tbody>{d.generations.map((g) => <tr key={g.id}><td><When date={g.createdAt} /></td><td>{moduleLabel(g.module)}</td><td><StateBadge state={g.status} /></td><td className="text-right tabular-nums">{formatNumber(g.credits)}</td></tr>)}</tbody>
            </table>
          </TableWrap>
        ) : <Empty />}
      </Section>
      <Section title={t.voices}>
        {d.voices.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{d.voices.map((v) => <li key={v.id} className="m-card flex items-center justify-between gap-3 p-4"><span className="truncate font-semibold">{v.name}</span><StateBadge state={v.status} /></li>)}</ul>
        ) : <Empty />}
      </Section>
    </>
  )
}
