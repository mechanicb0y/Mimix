'use client'
import Link from 'next/link'
import { Gauge } from 'lucide-react'
import { getMessages, fmt, formatNumber } from '@/i18n'
import { useAppContext } from './shell/context'

/** Shown when an action needs more credits than the workspace has. */
export function OverQuota({ needed, available }: { needed: number; available: number }) {
  const t = getMessages().app.common
  const ctx = useAppContext()
  const owner = ctx.workspace.role === 'owner'
  return (
    <div role="alert" className="flex flex-wrap items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--warning)] bg-[var(--surface-2)] p-4">
      <Gauge aria-hidden="true" size={20} className="mt-0.5 flex-none text-[var(--warning)]" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t.overQuotaTitle}</p>
        <p className="text-[14px] text-[var(--text-muted)]">{fmt(t.overQuotaBody, { needed: formatNumber(needed), available: formatNumber(available) })}</p>
      </div>
      {owner ? (
        <div className="flex flex-wrap gap-2">
          {ctx.workspace.planId !== 'free' ? <Link href="/app/settings/billing#top-up" className="m-btn secondary sm">{t.topUp}</Link> : null}
          <Link href="/app/settings/billing" className="m-btn primary sm">{t.upgrade}</Link>
        </div>
      ) : null}
    </div>
  )
}
