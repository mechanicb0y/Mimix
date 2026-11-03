import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminPage } from '@/server/admin/guard'
import { searchApiKeys, webhookDeliveries } from '@/server/admin/platform'
import { PAGE_SIZE } from '@/server/admin/users'
import { adminCan } from '@/config/admin'
import { KeyActions } from '@/components/admin/PlatformActions'
import { Empty, FilterCheck, FilterForm, FilterInput, FilterSelect, PageHeader, Pagination, StateBadge, TabLinks, TableWrap, When, plainParams, withParams } from '@/components/admin/ui'
import { formatNumber, getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: getMessages().admin.nav.developers }

const STATUSES = ['pending', 'delivered', 'failed'] as const

export default async function AdminDevelopers({ searchParams }: PageProps<'/admin/developers'>) {
  const actor = await requireAdminPage('viewDevelopers', '/admin/developers')
  const sp = plainParams(await searchParams)
  const a = getMessages().admin
  const t = a.developers
  const tab = sp.tab === 'webhooks' ? 'webhooks' : 'keys'
  const page = Math.max(1, Math.min(10_000, Number(sp.page) || 1))
  const q = (sp.q ?? '').trim().slice(0, 200)
  return (
    <>
      <PageHeader title={t.title} />
      <TabLinks base="/admin/developers" active={tab} label={t.title} tabs={[{ key: 'keys', label: t.tabs.keys }, { key: 'webhooks', label: t.tabs.webhooks }]} />
      {tab === 'keys'
        ? <Keys q={q} page={page} active={sp.active === '1'} canManage={adminCan(actor.role, 'manageDevelopers')} />
        : <Deliveries q={q} page={page} status={(STATUSES as readonly string[]).includes(sp.status ?? '') ? (sp.status as (typeof STATUSES)[number]) : undefined} />}
    </>
  )
}

async function Keys({ q, page, active, canManage }: { q: string; page: number; active: boolean; canManage: boolean }) {
  const a = getMessages().admin
  const t = a.developers
  const rows = await searchApiKeys(q, page, active)
  return (
    <>
      <FilterForm action="/admin/developers" label={t.tabs.keys}>
        <FilterInput name="q" label={t.searchKeys} defaultValue={q} />
        <FilterCheck name="active" label={t.activeOnly} checked={active} />
      </FilterForm>
      {rows.length ? (
        <TableWrap label={t.tabs.keys}>
          <table className="app-table">
            <thead><tr><th scope="col">{t.key}</th><th scope="col">{a.common.workspace}</th><th scope="col">{t.scopes}</th><th scope="col" className="text-right">{t.rateLimit}</th><th scope="col">{t.lastUsed}</th><th scope="col">{a.common.status}</th>{canManage ? <th scope="col"><span className="sr-only">{a.common.actions}</span></th> : null}</tr></thead>
            <tbody>
              {rows.map((k) => (
                <tr key={k.id}>
                  <td><code className="text-[13px]">{k.prefix}…</code><div className="text-[13px] text-[var(--text-muted)]">{k.name}</div></td>
                  <td>{k.workspaceName}<div className="break-all text-[13px] text-[var(--text-muted)]">{k.email}</div></td>
                  <td className="max-w-[240px] text-[13px]">{(k.scopes as string[]).join(', ')}</td>
                  <td className="text-right tabular-nums">{formatNumber(k.rateLimitPerMinute)}</td>
                  <td><When date={k.lastUsedAt} /></td>
                  <td><StateBadge state={k.revokedAt ? 'revoked' : 'active'} label={k.revokedAt ? t.revoked : t.active} /></td>
                  {canManage ? <td><KeyActions id={k.id} prefix={k.prefix} limit={k.rateLimitPerMinute} revoked={!!k.revokedAt} /></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : <Empty>{q ? a.common.noResults : undefined}</Empty>}
      <Pagination page={page} hasNext={rows.length === PAGE_SIZE} href={(p) => withParams('/admin/developers', { q, active: active ? '1' : undefined, page: p })} />
    </>
  )
}

async function Deliveries({ q, page, status }: { q: string; page: number; status?: (typeof STATUSES)[number] }) {
  const a = getMessages().admin
  const t = a.developers
  const rows = await webhookDeliveries({ q: q || undefined, status, page })
  return (
    <>
      <FilterForm action="/admin/developers" label={t.tabs.webhooks}>
        <input type="hidden" name="tab" value="webhooks" />
        <FilterInput name="q" label={t.searchDeliveries} defaultValue={q} />
        <FilterSelect name="status" label={a.common.status} value={status} options={STATUSES.map((s) => ({ value: s, label: t.deliveryStatuses[s] }))} />
      </FilterForm>
      {rows.length ? (
        <TableWrap label={t.tabs.webhooks}>
          <table className="app-table">
            <thead><tr><th scope="col">{a.common.when}</th><th scope="col">{t.event}</th><th scope="col">{t.url}</th><th scope="col">{a.common.status}</th><th scope="col" className="text-right">{t.attempts}</th><th scope="col">{t.response}</th><th scope="col">{t.nextAttempt}</th></tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td><When date={d.createdAt} /></td>
                  <td><code className="text-[13px]">{d.event}</code></td>
                  <td className="max-w-[280px] break-all text-[13px]">{d.url}<div className="text-[var(--text-subtle)]"><Link href={withParams('/admin/developers', { tab: 'webhooks', q: d.workspaceId })}>{d.workspaceId}</Link></div></td>
                  <td><StateBadge state={d.status} label={t.deliveryStatuses[d.status]} /></td>
                  <td className="text-right tabular-nums">{d.attempts}</td>
                  <td>{d.responseCode ?? '—'}</td>
                  <td>{d.status === 'pending' ? <When date={d.nextAttemptAt} /> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : <Empty>{q || status ? a.common.noResults : undefined}</Empty>}
      <Pagination page={page} hasNext={rows.length === PAGE_SIZE} href={(p) => withParams('/admin/developers', { tab: 'webhooks', q, status, page: p })} />
    </>
  )
}
