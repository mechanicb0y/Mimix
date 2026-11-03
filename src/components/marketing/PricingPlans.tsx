'use client'
import Link from 'next/link'
import { ToggleGroup } from 'radix-ui'
import { Check } from 'lucide-react'
import { useState } from 'react'

export interface PlanView {
  id: string; name: string; blurb: string; cta: string; href: string; highlighted: boolean
  /** Minor units; null = custom pricing. */
  monthly: number | null; annualPerMonth: number | null
  features: string[]
}
export interface PricingLabels {
  label: string; monthly: string; annual: string; save: string; announceMonthly: string; announceAnnual: string
  plansHeading: string; perMonth: string; billedAnnually: string; billedMonthly: string; free: string; custom: string; popular: string
}

export function formatMoney(minor: number, currency: string, locale = 'en-US') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: minor % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(minor / 100)
}

/** Plan cards with a Monthly/Annual toggle that updates every price without reloading. */
export function PricingPlans({ plans, labels, currency, discountPct }: { plans: PlanView[]; labels: PricingLabels; currency: string; discountPct: number }) {
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly')
  return (
    <div>
      <h2 className="sr-only">{labels.plansHeading}</h2>
      <div className="flex flex-col items-center gap-2">
        <ToggleGroup.Root type="single" value={period} onValueChange={(v) => v && setPeriod(v as 'monthly' | 'annual')} aria-label={labels.label} className="seg">
          <ToggleGroup.Item value="monthly" className="seg-item">{labels.monthly}</ToggleGroup.Item>
          <ToggleGroup.Item value="annual" className="seg-item">{labels.annual} <span className="ml-1 text-xs opacity-90">· {labels.save.replace('{pct}', String(discountPct))}</span></ToggleGroup.Item>
        </ToggleGroup.Root>
        <p role="status" aria-live="polite" className="sr-only">{period === 'annual' ? labels.announceAnnual : labels.announceMonthly}</p>
      </div>
      <ul className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => {
          const price = period === 'annual' ? p.annualPerMonth : p.monthly
          return (
            <li key={p.id} className={`m-card relative flex flex-col ${p.highlighted ? 'border-primary shadow-[var(--glow)]' : ''}`} data-plan={p.id}>
              {p.highlighted && <span className="m-badge brand absolute -top-3 left-6">{labels.popular}</span>}
              <h3 className="font-display text-xl font-semibold">{p.name}</h3>
              <p className="mt-1 min-h-[40px] text-sm text-text-muted">{p.blurb}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold" data-testid={`price-${p.id}`}>{price === null ? labels.custom : formatMoney(price, currency)}</span>
                {price !== null && price > 0 && <span className="text-text-muted">{labels.perMonth}</span>}
              </p>
              <p className="mt-1 min-h-[20px] text-sm text-text-subtle">
                {price === null ? ' ' : price === 0 ? labels.free : period === 'annual' ? labels.billedAnnually.replace('{amount}', formatMoney((p.annualPerMonth ?? 0) * 12, currency)) : labels.billedMonthly}
              </p>
              <Link href={p.href} className={`m-btn ${p.highlighted ? 'primary' : 'secondary'} mt-6 w-full`}>{p.cta}</Link>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check size={16} strokeWidth={2} aria-hidden="true" className="mt-0.5 flex-none text-accent" /><span className="text-text-muted">{f}</span></li>)}
              </ul>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
