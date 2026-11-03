'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertDialog } from 'radix-ui'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, ExternalLink } from 'lucide-react'
import { useId, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages, fmt, formatDate, formatNumber } from '@/i18n'
import { TOP_UPS, formatPrice, type BillingPeriod, type Plan } from '@/config/plans'
import { FormMessage } from '@/components/app/Field'
import { ConfirmButton } from '@/components/app/Confirm'
import { Section } from './Section'

interface Invoice { id: string; number: string | null; amountDue: number; amountPaid: number; currency: string; status: string; hostedUrl: string | null; pdfUrl: string | null; createdAt: string }
interface Billing {
  plan: Plan['id']; owner: boolean; comped: boolean; compUntil: string | null; period: BillingPeriod; status: string; cancelAtPeriodEnd: boolean; subscribed: boolean; hasBillingAccount: boolean
  cycleEndsAt: string; allowance: number | null; balance: { plan: number; topUp: number; total: number; unlimited: boolean }; invoices: Invoice[]
}

const RANK: Record<string, number> = { free: 0, maker: 1, pro: 2, production: 3, team: 4, enterprise: 5 }
const day = (iso: string) => formatDate(iso.slice(0, 10))

export function BillingSettings({ canManage, plans }: { canManage: boolean; plans: Plan[] }) {
  const t = getMessages().app.settings.billing
  const names = getMessages().pricing.plans
  const c = getMessages().app.common
  const sp = useSearchParams()
  const qc = useQueryClient()
  const router = useRouter()
  const q = useQuery({ queryKey: ['billing'], queryFn: () => api<Billing>('/api/v1/billing') })
  const [notice, setNotice] = useState<{ tone: 'error' | 'success' | 'info'; text: string } | null>(() => {
    const ck = sp.get('checkout'), tu = sp.get('topup')
    if (ck === 'success') return { tone: 'success', text: t.checkoutSuccess }
    if (ck === 'canceled' || tu === 'canceled') return { tone: 'info', text: t.checkoutCanceled }
    if (tu === 'success') return { tone: 'success', text: t.topUpSuccess }
    return null
  })
  const done = (text: string) => { setNotice({ tone: 'success', text }); void qc.invalidateQueries({ queryKey: ['billing'] }); router.refresh() }
  const fail = (e: unknown) => setNotice({ tone: 'error', text: e instanceof ApiClientError ? e.message : c.networkError })
  const go = async (path: string, json?: unknown) => {
    setNotice({ tone: 'info', text: t.redirecting })
    try { const r = await api<{ url: string }>(path, { method: 'POST', json }); window.location.assign(r.url) } catch (e) { fail(e) }
  }

  if (q.isLoading) return <div className="m-skeleton h-64" aria-hidden="true" />
  if (q.isError || !q.data) return <FormMessage>{q.error instanceof ApiClientError ? q.error.message : c.networkError}</FormMessage>
  const b = q.data
  const statusLabel = (t.status as Record<string, string>)[b.status] ?? ''

  return (
    <>
      <div aria-live="polite">{notice ? <FormMessage tone={notice.tone}>{notice.text}</FormMessage> : null}</div>
      {b.status === 'past_due' ? <FormMessage>{t.pastDue}</FormMessage> : null}
      <Section title={t.title} body={t.body}>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[12px] border border-[var(--border)] p-4">
            <dt className="text-[13px] text-[var(--text-muted)]">{t.current}</dt>
            {b.owner ? (
              <>
                <dd className="mt-1 text-[22px] font-semibold">{t.ownerPlan}</dd>
                <dd className="mt-1 text-[14px] text-[var(--text-muted)]">{t.ownerBody}</dd>
              </>
            ) : (
              <>
                <dd className="mt-1 flex flex-wrap items-center gap-2 text-[22px] font-semibold">{names[b.plan].name}{statusLabel ? <span className="m-badge">{statusLabel}</span> : null}</dd>
                <dd className="mt-1 text-[14px] text-[var(--text-muted)]">
                  {b.comped ? (b.compUntil ? fmt(t.compedUntil, { date: day(b.compUntil) }) : t.comped)
                    : <>{b.plan !== 'free' && b.subscribed ? `${b.period === 'annual' ? t.periodAnnual : t.periodMonthly} · ` : ''}{b.cancelAtPeriodEnd ? fmt(t.cancelsOn, { date: day(b.cycleEndsAt) }) : fmt(t.renews, { date: day(b.cycleEndsAt) })}</>}
                </dd>
              </>
            )}
          </div>
          <div className="rounded-[12px] border border-[var(--border)] p-4">
            <dt className="text-[13px] text-[var(--text-muted)]">{t.credits}</dt>
            <dd className="mt-1 text-[22px] font-semibold tabular-nums">{b.balance.unlimited ? t.unlimited : formatNumber(b.balance.total)}</dd>
            {!b.balance.unlimited ? (
              <dd className="mt-1 text-[14px] text-[var(--text-muted)]">
                {fmt(t.planCredits, { count: formatNumber(b.balance.plan) })}{b.balance.topUp ? ` · ${fmt(t.topUpCredits, { count: formatNumber(b.balance.topUp) })}` : ''}
              </dd>
            ) : null}
          </div>
        </dl>
        {!canManage ? <FormMessage tone="info">{t.ownerOnly}</FormMessage> : (
          <div className="flex flex-wrap gap-2">
            {b.hasBillingAccount ? <button type="button" className="m-btn secondary" onClick={() => go('/api/v1/billing/portal')}><ExternalLink aria-hidden="true" />{t.portal}</button> : null}
            {b.subscribed && !b.cancelAtPeriodEnd ? (
              <ConfirmButton className="m-btn ghost" title={t.cancelTitle} body={fmt(t.cancelBody, { date: day(b.cycleEndsAt) })} confirmLabel={t.cancelConfirm}
                onConfirm={async () => { try { await api('/api/v1/billing/cancel', { method: 'POST', json: { cancel: true } }); done(fmt(t.canceled, { date: day(b.cycleEndsAt) })) } catch (e) { fail(e) } }}>
                {t.cancel}
              </ConfirmButton>
            ) : null}
            {b.subscribed && b.cancelAtPeriodEnd ? (
              <button type="button" className="m-btn primary" onClick={async () => { try { await api('/api/v1/billing/cancel', { method: 'POST', json: { cancel: false } }); done(t.resumed) } catch (e) { fail(e) } }}>{t.resume}</button>
            ) : null}
          </div>
        )}
      </Section>
      {canManage || b.owner ? <PlanPicker b={b} plans={plans} onCheckout={(plan, period) => go('/api/v1/billing/checkout', { plan, period })} onChanged={(plan) => done(fmt(t.changed, { plan: names[plan].name }))} onError={fail} /> : null}
      {canManage && !b.owner ? (
        <Section title={t.topUpTitle} body={b.plan === 'free' ? t.topUpFree : t.topUpBody}>
          {b.plan !== 'free' ? (
            <ul className="grid gap-2 sm:grid-cols-3">
              {TOP_UPS.map((p) => (
                <li key={p.id}>
                  <button type="button" className="m-btn secondary w-full" onClick={() => go('/api/v1/billing/top-up', { topUp: p.id })}>
                    {fmt(t.buy, { credits: formatNumber(p.credits), price: formatPrice(p.prices.USD, 'USD') })}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      ) : null}
      <Section title={t.invoices}>
        {!b.invoices.length ? <p className="app-empty">{t.invoicesEmpty}</p> : (
          <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label={t.invoices}>
            <table className="app-table">
              <thead><tr>{(['date', 'number', 'amount', 'status', 'links'] as const).map((k) => <th key={k} scope="col">{t.invoiceColumns[k]}</th>)}</tr></thead>
              <tbody>
                {b.invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="whitespace-nowrap">{day(i.createdAt)}</td>
                    <td>{i.number ?? '—'}</td>
                    <td className="tabular-nums">{formatPrice(i.status === 'paid' ? i.amountPaid : i.amountDue, i.currency.toUpperCase() as 'USD')}</td>
                    <td>{t.invoiceStatus[i.status] ?? i.status}</td>
                    <td className="flex flex-wrap gap-2">
                      {i.hostedUrl ? <a className="link" href={i.hostedUrl} target="_blank" rel="noreferrer">{t.viewInvoice}</a> : null}
                      {i.pdfUrl ? <a className="link" href={i.pdfUrl} target="_blank" rel="noreferrer">{t.pdf}</a> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  )
}

function PlanPicker({ b, plans, onCheckout, onChanged, onError }: { b: Billing; plans: Plan[]; onCheckout: (plan: string, period: BillingPeriod) => void; onChanged: (plan: Plan['id']) => void; onError: (e: unknown) => void }) {
  const t = getMessages().app.settings.billing
  const names = getMessages().pricing.plans
  const c = getMessages().app.common
  const id = useId()
  const [period, setPeriod] = useState<BillingPeriod>(b.plan === 'free' ? 'monthly' : b.period)
  const [confirm, setConfirm] = useState<Plan | null>(null)
  const change = useMutation({
    mutationFn: (p: Plan) => api<{ changed?: boolean; url?: string }>('/api/v1/billing/checkout', { method: 'POST', json: { plan: p.id, period } }),
    onSuccess: (r, p) => { setConfirm(null); if (r.url) window.location.assign(r.url); else onChanged(p.id) },
    onError: (e) => { setConfirm(null); onError(e) },
  })
  const choose = (p: Plan) => (b.subscribed ? setConfirm(p) : onCheckout(p.id, period))
  const upgrade = confirm ? RANK[confirm.id]! > RANK[b.plan]! : false
  // The Owner needs no plan: the cards are a preview of what customers see.
  const preview = b.owner
  return (
    <Section title={preview ? t.ownerPreview : t.changePlan} body={preview ? t.ownerPreviewBody : undefined}>
      <fieldset className="flex flex-wrap gap-4">
        <legend className="m-label">{t.periodLabel}</legend>
        {(['monthly', 'annual'] as const).map((p) => (
          <label key={p} className="flex min-h-11 items-center gap-2 text-[14px]">
            <input type="radio" name={`${id}-period`} className="size-4 accent-[var(--primary)]" checked={period === p} onChange={() => setPeriod(p)} />{t[p]}
          </label>
        ))}
      </fieldset>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {plans.filter((p) => p.id !== 'free').map((p) => {
          const price = p.prices.USD
          const current = !preview && p.id === b.plan && (p.id === 'enterprise' || period === b.period)
          return (
            <li key={p.id} className={`grid content-between gap-3 rounded-[14px] border p-4 ${current ? 'border-[var(--primary)]' : 'border-[var(--border)]'}`}>
              <div>
                <p className="flex items-center gap-2 font-semibold">{names[p.id].name}{current ? <span className="m-badge brand"><Check size={12} aria-hidden="true" />{t.currentBadge}</span> : null}</p>
                {price ? <p className="mt-1 text-[20px] font-semibold">{fmt(t.perMonth, { price: formatPrice(period === 'annual' ? price.annualPerMonth : price.monthly, 'USD') })}</p> : null}
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                  {p.creditsPerMonth ? fmt(t.creditsPerMonth, { count: formatNumber(p.creditsPerMonth) }) : names[p.id].blurb}
                  {p.seats ? ` · ${p.seats === 1 ? t.seat : fmt(t.seats, { count: p.seats })}` : ''}
                </p>
              </div>
              {p.id === 'enterprise' && !preview ? <Link href="/contact-sales" className="m-btn secondary">{t.contactSales}</Link>
                : p.id === 'enterprise' ? <button type="button" className="m-btn secondary" disabled>{t.contactSales}</button>
                : <button type="button" className={p.highlighted && !current && !preview ? 'm-btn primary' : 'm-btn secondary'} disabled={preview || current || change.isPending} onClick={() => choose(p)}>{fmt(t.choose, { plan: names[p.id].name })}</button>}
            </li>
          )
        })}
      </ul>
      <AlertDialog.Root open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null) }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="drawer-overlay" style={{ zIndex: 'var(--z-modal)' }} />
          <AlertDialog.Content className="m-dialog">
            <AlertDialog.Title className="text-[20px] font-semibold">{confirm ? fmt(t.changeConfirmTitle, { plan: names[confirm.id].name }) : ''}</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-[var(--text-muted)]">{upgrade ? t.upgradeBody : t.downgradeBody}</AlertDialog.Description>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <AlertDialog.Cancel className="m-btn secondary">{c.cancel}</AlertDialog.Cancel>
              <button type="button" className="m-btn primary" aria-busy={change.isPending} disabled={change.isPending} onClick={() => confirm && change.mutate(confirm)}>{t.switch}</button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Section>
  )
}
