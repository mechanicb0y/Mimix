import type { Metadata } from 'next'
import { requireAdminPage } from '@/server/admin/guard'
import { listCoupons, planTable, type CouponView } from '@/server/admin/platform'
import { CouponCreate, CouponDeactivate, PlanEdit } from '@/components/admin/PlatformActions'
import { Empty, Notice, PageHeader, Section, StateBadge, TableWrap, planLabel } from '@/components/admin/ui'
import { formatPrice, type Plan } from '@/config/plans'
import { fmt, formatNumber, getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: getMessages().admin.nav.plans }

function same(a: Plan, b: Plan) {
  return JSON.stringify([a.prices, a.creditsPerMonth, a.seats, a.customVoices, a.professionalClones, a.mixerSources]) === JSON.stringify([b.prices, b.creditsPerMonth, b.seats, b.customVoices, b.professionalClones, b.mixerSources])
}

export default async function AdminPlans() {
  await requireAdminPage('managePlans', '/admin/plans')
  const a = getMessages().admin
  const t = a.plans
  const rows = await planTable()
  let coupons: CouponView[] = []
  let couponError: string | null = null
  try { coupons = await listCoupons() } catch (e) { couponError = e instanceof Error ? e.message : String(e) }
  const n = (v: number | null) => (v === null ? t.contactSales : formatNumber(v))
  const price = (p: Plan) => p.prices.USD ? `${formatPrice(p.prices.USD.monthly, 'USD')} / ${formatPrice(p.prices.USD.annualPerMonth, 'USD')}` : t.contactSales
  return (
    <>
      <PageHeader title={t.title} body={t.body} />
      <Section title={t.tableTitle}>
        <TableWrap label={t.tableTitle}>
          <table className="app-table">
            <thead><tr>
              <th scope="col">{a.common.plan}</th><th scope="col">{t.monthly} / {t.annual}</th><th scope="col" className="text-right">{t.credits}</th>
              <th scope="col" className="text-right">{t.seats}</th><th scope="col" className="text-right">{t.customVoices}</th><th scope="col" className="text-right">{t.professionalClones}</th>
              <th scope="col" className="text-right">{t.mixerSources}</th><th scope="col"><span className="sr-only">{a.common.actions}</span></th>
            </tr></thead>
            <tbody>
              {rows.map(({ defaults: d, current: p }) => {
                const edited = !same(d, p)
                return (
                  <tr key={p.id}>
                    <th scope="row" className="text-left">{planLabel(p.id)}{edited ? <> <StateBadge state="pending" label={t.edited} /></> : null}</th>
                    <td title={edited ? fmt(t.default, { value: price(d) }) : undefined}>{price(p)}</td>
                    <td className="text-right tabular-nums">{n(p.creditsPerMonth)}</td>
                    <td className="text-right tabular-nums">{n(p.seats)}</td>
                    <td className="text-right tabular-nums">{n(p.customVoices)}</td>
                    <td className="text-right tabular-nums">{formatNumber(p.professionalClones)}</td>
                    <td className="text-right tabular-nums">{p.mixerSources}</td>
                    <td><PlanEdit edited={edited} plan={{
                      id: p.id, name: planLabel(p.id), monthly: p.prices.USD?.monthly ?? null, annualPerMonth: p.prices.USD?.annualPerMonth ?? null,
                      creditsPerMonth: p.creditsPerMonth, seats: p.seats, customVoices: p.customVoices, professionalClones: p.professionalClones, mixerSources: p.mixerSources,
                      hasPrice: p.id !== 'enterprise',
                    }} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableWrap>
      </Section>
      <Section title={t.coupons} actions={couponError ? null : <CouponCreate />}>
        <p className="mb-3 text-[14px] text-[var(--text-muted)]">{t.couponsBody}</p>
        {couponError ? <Notice tone="warning">{fmt(t.couponsUnavailable, { message: couponError })}</Notice> : coupons.length ? (
          <TableWrap label={t.coupons}>
            <table className="app-table">
              <thead><tr><th scope="col">{t.code}</th><th scope="col">{a.common.details}</th><th scope="col">{t.duration}</th><th scope="col" className="text-right">{t.used}</th><th scope="col">{t.expires}</th><th scope="col">{a.common.status}</th><th scope="col"><span className="sr-only">{a.common.actions}</span></th></tr></thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold"><code>{c.code}</code></td>
                    <td>{c.percentOff !== null ? `${c.percentOff}%` : c.amountOff !== null ? formatPrice(c.amountOff, 'USD') : '—'}</td>
                    <td>{t.durations[c.duration as keyof typeof t.durations] ?? c.duration}{c.durationInMonths ? ` (${c.durationInMonths})` : ''}</td>
                    <td className="text-right tabular-nums">{formatNumber(c.timesRedeemed)}{c.maxRedemptions ? ` / ${formatNumber(c.maxRedemptions)}` : ''}</td>
                    <td>{c.expiresAt ?? a.common.never}</td>
                    <td><StateBadge state={c.active ? 'active' : 'disabled'} label={c.active ? a.developers.active : t.inactive} /></td>
                    <td className="text-right">{c.active ? <CouponDeactivate id={c.id} code={c.code} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : <Empty />}
      </Section>
    </>
  )
}
