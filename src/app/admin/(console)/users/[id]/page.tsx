import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/server/admin/guard'
import { userDetail } from '@/server/admin/users'
import { PLAN_IDS } from '@/server/db/schema'
import { adminCan, isStaff, outranks } from '@/config/admin'
import { UserActions } from '@/components/admin/UserActions'
import { Empty, Facts, PageHeader, Section, StateBadge, TableWrap, When, moduleLabel, planLabel } from '@/components/admin/ui'
import { fmt, formatDate, formatNumber, getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: getMessages().admin.nav.users }

export default async function AdminUser({ params }: PageProps<'/admin/users/[id]'>) {
  const { id } = await params
  const actor = await requireAdminPage('viewUsers', `/admin/users/${id}`)
  const d = await userDetail(id)
  if (!d) notFound()
  const a = getMessages().admin
  const t = a.users
  const u = d.user
  const can = (p: Parameters<typeof adminCan>[1]) => adminCan(actor.role, p)
  // Staff act only on lower roles (Owners also on Owners); staff 2FA resets need an Owner. The server enforces the same rules.
  const reach = outranks(actor.role, u.role)
  const perms = {
    credits: can('adjustCredits') && reach, plan: can('changePlan') && reach, suspend: can('suspendUsers') && reach, ban: can('banUsers') && reach,
    twoFactor: can('resetTwoFactor') && reach && (!isStaff(u.role) || actor.role === 'owner'), role: can('manageRoles'),
  }
  return (
    <>
      <p className="mb-2 text-[14px]"><Link href="/admin/users">{t.title}</Link></p>
      <PageHeader title={u.name || u.email} body={u.email} actions={can('viewAsUser') ? <Link href={`/admin/users/${u.id}/view`} className="m-btn secondary sm">{t.viewAs}</Link> : null} />
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="m-card p-4 sm:p-6">
          <Facts items={[
            [a.common.id, <code key="id" className="text-[13px]">{u.id}</code>],
            [a.common.role, a.roles[u.role]],
            [a.common.status, <StateBadge key="s" state={u.status} label={a.statuses[u.status]} />],
            [t.verified, u.emailVerified ? a.common.yes : a.common.no],
            [t.twoFactor, u.twoFactorEnabled ? a.common.yes : a.common.no],
            [t.joined, <When key="j" date={u.createdAt} />],
            ...(d.reports ? [[t.reportsLabel, <Link key="r" href={`/admin/generations?tab=reports`}>{fmt(t.reportsAgainst, { count: formatNumber(d.reports) })}</Link>] as [string, React.ReactNode]] : []),
          ]} />
        </div>
        <UserActions userId={u.id} status={u.status} role={u.role} twoFactorEnabled={!!u.twoFactorEnabled} perms={perms} isSelf={u.id === actor.id}
          planOptions={PLAN_IDS.map((p) => ({ value: p, label: planLabel(p) }))}
          workspaces={d.workspaces.map((w) => ({ id: w.workspace.id, name: w.workspace.name, planId: w.workspace.planId, stripeManaged: !!w.workspace.stripeSubscriptionId }))} />
      </div>

      <Section title={t.workspaces}>
        <TableWrap label={t.workspaces}>
          <table className="app-table">
            <thead><tr><th scope="col">{a.common.name}</th><th scope="col">{a.common.role}</th><th scope="col">{a.common.plan}</th><th scope="col" className="text-right">{t.balance}</th><th scope="col" className="text-right">{t.members}</th></tr></thead>
            <tbody>
              {d.workspaces.map((w) => (
                <tr key={w.workspace.id}>
                  <td>{w.workspace.name}<div className="text-[12px] text-[var(--text-subtle)]"><code>{w.workspace.id}</code></div></td>
                  <td>{w.role}</td>
                  <td>
                    {w.workspace.unlimited ? t.ownerAll : planLabel(w.workspace.planId)}
                    {w.workspace.comped && !w.workspace.unlimited ? <div className="text-[12px] text-[var(--text-subtle)]">{w.workspace.compUntil ? fmt(t.compedUntil, { date: formatDate(w.workspace.compUntil.toISOString().slice(0, 10)) }) : t.comped}</div> : null}
                  </td>
                  <td className="text-right tabular-nums">{w.balance.unlimited ? a.common.unlimited : formatNumber(w.balance.total)}</td>
                  <td className="text-right tabular-nums">{formatNumber(w.members)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Section>

      <Section title={t.usage}>
        {d.usage.length ? (
          <TableWrap label={t.usage}>
            <table className="app-table">
              <thead><tr><th scope="col">{t.module}</th><th scope="col" className="text-right">{t.count}</th><th scope="col" className="text-right">{t.units}</th><th scope="col" className="text-right">{a.common.credits}</th></tr></thead>
              <tbody>{d.usage.map((r) => <tr key={r.module}><td>{moduleLabel(r.module)}</td><td className="text-right tabular-nums">{formatNumber(r.n)}</td><td className="text-right tabular-nums">{formatNumber(r.units)}</td><td className="text-right tabular-nums">{formatNumber(r.credits)}</td></tr>)}</tbody>
            </table>
          </TableWrap>
        ) : <Empty />}
      </Section>

      <Section title={t.adjustments}>
        {d.adjustments.length ? (
          <TableWrap label={t.adjustments}>
            <table className="app-table">
              <thead><tr><th scope="col">{a.common.when}</th><th scope="col" className="text-right">{a.common.credits}</th><th scope="col">{t.adjustmentBy}</th><th scope="col">{t.note}</th></tr></thead>
              <tbody>{d.adjustments.map((r) => <tr key={r.id}><td><When date={r.createdAt} /></td><td className="text-right tabular-nums">{r.delta > 0 ? '+' : ''}{formatNumber(r.delta)}</td><td>{r.actorId ? <Link href={`/admin/users/${r.actorId}`}><code className="text-[13px]">{r.actorId}</code></Link> : '—'}</td><td className="max-w-[360px] break-words">{r.note}</td></tr>)}</tbody>
            </table>
          </TableWrap>
        ) : <Empty />}
      </Section>

      <Section title={t.voices}>
        {d.voices.length ? (
          <TableWrap label={t.voices}>
            <table className="app-table">
              <thead><tr><th scope="col">{a.common.name}</th><th scope="col">{a.voices.kind}</th><th scope="col">{a.common.status}</th><th scope="col">{a.common.created}</th></tr></thead>
              <tbody>{d.voices.map((v) => <tr key={v.id}><td>{can('moderateVoices') ? <Link href={`/admin/voices/${v.id}`}>{v.name}</Link> : v.name}</td><td>{v.kind}</td><td><StateBadge state={v.status} /></td><td><When date={v.createdAt} /></td></tr>)}</tbody>
            </table>
          </TableWrap>
        ) : <Empty />}
      </Section>

      <Section title={t.sessions}>
        {d.sessions.length ? (
          <TableWrap label={t.sessions}>
            <table className="app-table">
              <thead><tr><th scope="col">{t.lastActive}</th><th scope="col">{t.ip}</th><th scope="col">{t.device}</th></tr></thead>
              <tbody>{d.sessions.map((s) => <tr key={s.id}><td><When date={s.updatedAt} /></td><td>{s.ipAddress ?? '—'}</td><td className="max-w-[420px] truncate" title={s.userAgent ?? undefined}>{s.userAgent ?? '—'}</td></tr>)}</tbody>
            </table>
          </TableWrap>
        ) : <Empty />}
      </Section>
    </>
  )
}
