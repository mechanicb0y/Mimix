import type { Metadata } from 'next'
import { requireAdminPage } from '@/server/admin/guard'
import { flagRules } from '@/server/flags'
import { getSetting } from '@/server/settings'
import { PLAN_IDS } from '@/server/db/schema'
import { FLAG_KEYS } from '@/config/flags'
import { BannerEdit, FlagEdit, MaintenanceToggle } from '@/components/admin/PlatformActions'
import { Facts, Notice, PageHeader, Section, StateBadge, TableWrap, planLabel } from '@/components/admin/ui'
import { fmt, getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: getMessages().admin.nav.flags }

export default async function AdminFlags() {
  await requireAdminPage('manageFlags', '/admin/flags')
  const a = getMessages().admin
  const t = a.flags
  const [rules, banner, maintenance] = await Promise.all([flagRules(), getSetting('announcement', true), getSetting('maintenance', true)])
  const planOptions = PLAN_IDS.map((p) => ({ value: p, label: planLabel(p) }))
  const b = banner ?? { active: false, message: '', tone: 'info' as const, href: '' }
  const m = maintenance ?? { active: false, message: '' }
  return (
    <>
      <PageHeader title={t.title} body={t.body} />
      {m.active ? <Notice tone="warning">{t.maintenanceActive}</Notice> : null}
      <Section title={t.toolsTitle}>
        <TableWrap label={t.title}>
          <table className="app-table">
            <thead><tr><th scope="col">{t.tool}</th><th scope="col">{t.state}</th><th scope="col"><span className="sr-only">{a.common.actions}</span></th></tr></thead>
            <tbody>
              {FLAG_KEYS.map((k) => {
                const r = rules[k]
                const who = !r.enabled ? t.off : r.plans.length ? `${t.plansOnly}: ${r.plans.map(planLabel).join(', ')}` : t.everyone
                return (
                  <tr key={k}>
                    <th scope="row" className="text-left">{t.tools[k]}</th>
                    <td><StateBadge state={!r.enabled ? 'disabled' : r.plans.length ? 'pending' : 'active'} label={who} />{r.userIds.length ? <span className="ml-2 text-[13px] text-[var(--text-muted)]">{fmt(t.plusUsers, { count: r.userIds.length })}</span> : null}</td>
                    <td className="text-right"><FlagEdit flagKey={k} label={t.tools[k]} enabled={r.enabled} plans={r.plans} userIds={r.userIds} planOptions={planOptions} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableWrap>
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t.banner} actions={<BannerEdit value={b} />}>
          <div className="m-card p-4">
            <p className="mb-3 text-[14px] text-[var(--text-muted)]">{t.bannerBody}</p>
            <Facts items={[[a.common.status, <StateBadge key="s" state={b.active ? 'active' : 'disabled'} label={b.active ? t.enabled : t.off} />], [t.message, b.message || '—'], [t.tone, t.tones[b.tone]], [t.link, b.href || '—']]} />
          </div>
        </Section>
        <Section title={t.maintenance} actions={<MaintenanceToggle active={m.active} message={m.message} />}>
          <div className="m-card p-4">
            <p className="mb-3 text-[14px] text-[var(--text-muted)]">{t.maintenanceBody}</p>
            <Facts items={[[a.common.status, <StateBadge key="s" state={m.active ? 'suspended' : 'active'} label={m.active ? t.enabled : t.off} />], [t.maintenanceMessage, m.message || '—']]} />
          </div>
        </Section>
      </div>
    </>
  )
}
