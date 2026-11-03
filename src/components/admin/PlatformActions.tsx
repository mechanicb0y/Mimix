'use client'
import { useState } from 'react'
import { ActionDialog } from './ActionDialog'
import { useAdminApi } from './admin-api'
import { ApiClientError } from '@/lib/api-client'
import { fmt, getMessages } from '@/i18n'

const num = (v: string | undefined) => (v === undefined || v.trim() === '' ? null : Number(v))
const cents = (v: string | undefined) => (v === undefined || v.trim() === '' ? null : Math.round(Number(v) * 100))
const dollars = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n / 100))
const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))

export interface PlanValues { id: string; name: string; monthly: number | null; annualPerMonth: number | null; creditsPerMonth: number | null; seats: number | null; customVoices: number | null; professionalClones: number; mixerSources: 2 | 3; hasPrice: boolean }

export function PlanEdit({ plan, edited, onSaved }: { plan: PlanValues; edited: boolean; onSaved?: string }) {
  const t = getMessages().admin.plans
  const c = getMessages().admin.common
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActionDialog trigger={<>{getMessages().admin.flags.edit}<span className="sr-only"> {plan.name}</span></>} title={plan.name} body={t.body} submitLabel={c.save} method="PUT" path={`/api/admin/plans/${plan.id}`}
        fields={[
          ...(plan.hasPrice ? [
            { name: 'monthly', label: t.monthly, type: 'number' as const, defaultValue: dollars(plan.monthly) },
            { name: 'annualPerMonth', label: t.annual, type: 'number' as const, defaultValue: dollars(plan.annualPerMonth) },
          ] : []),
          { name: 'creditsPerMonth', label: t.credits, type: 'number', defaultValue: str(plan.creditsPerMonth) },
          { name: 'seats', label: t.seats, type: 'number', defaultValue: str(plan.seats) },
          { name: 'customVoices', label: t.customVoices, type: 'number', defaultValue: str(plan.customVoices) },
          { name: 'professionalClones', label: t.professionalClones, type: 'number', defaultValue: str(plan.professionalClones) },
          { name: 'mixerSources', label: t.mixerSources, type: 'select', defaultValue: String(plan.mixerSources), options: [{ value: '2', label: '2' }, { value: '3', label: '3' }] },
        ]}
        toJson={(v) => ({
          monthly: plan.hasPrice ? cents(v.monthly) : null, annualPerMonth: plan.hasPrice ? cents(v.annualPerMonth) : null,
          creditsPerMonth: num(v.creditsPerMonth), seats: num(v.seats), customVoices: num(v.customVoices),
          professionalClones: num(v.professionalClones) ?? 0, mixerSources: Number(v.mixerSources), reason: v.reason,
        })}
        onDone={(d) => { const ids = (d as { stripePrices?: string[] } | null)?.stripePrices ?? []; setMsg(ids.length ? fmt(t.stripeSynced, { ids: ids.join(', ') }) : c.saved) }} />
      {edited ? (
        <ActionDialog trigger={t.reset} title={t.reset} body={t.resetBody} submitLabel={t.reset} method="DELETE" path={`/api/admin/plans/${plan.id}`} triggerClass="m-btn ghost sm" onDone={() => setMsg(c.saved)} />
      ) : null}
      <span role="status" className="text-[13px] text-[var(--text-muted)]">{msg ?? onSaved}</span>
    </div>
  )
}

export function CouponCreate() {
  const t = getMessages().admin.plans
  return (
    <ActionDialog trigger={t.create} title={t.create} body={t.couponsBody} submitLabel={t.create} reason={false} path="/api/admin/coupons" triggerClass="m-btn primary sm"
      fields={[
        { name: 'code', label: t.code, type: 'text', required: true, placeholder: 'LAUNCH20' },
        { name: 'percentOff', label: t.percentOff, type: 'number' },
        { name: 'amountOff', label: t.amountOff, type: 'number' },
        { name: 'duration', label: t.duration, type: 'select', defaultValue: 'once', options: (['once', 'repeating', 'forever'] as const).map((d) => ({ value: d, label: t.durations[d] })) },
        { name: 'durationInMonths', label: t.months, type: 'number' },
        { name: 'maxRedemptions', label: t.maxRedemptions, type: 'number' },
        { name: 'expiresAt', label: t.expires, type: 'date' },
      ]}
      toJson={(v) => ({
        code: v.code, percentOff: num(v.percentOff), amountOff: cents(v.amountOff), duration: v.duration,
        durationInMonths: v.duration === 'repeating' ? num(v.durationInMonths) : null, maxRedemptions: num(v.maxRedemptions), expiresAt: v.expiresAt || null,
      })} />
  )
}

export function CouponDeactivate({ id, code }: { id: string; code: string }) {
  const t = getMessages().admin.plans
  return <ActionDialog trigger={t.deactivate} title={fmt(t.deactivateTitle, { code })} submitLabel={t.deactivate} reason={false} tone="danger" method="DELETE" path={`/api/admin/coupons/${id}`} triggerClass="m-btn ghost sm" />
}

export function FlagEdit({ flagKey, label, enabled, plans, userIds, planOptions }: { flagKey: string; label: string; enabled: boolean; plans: string[]; userIds: string[]; planOptions: Array<{ value: string; label: string }> }) {
  const t = getMessages().admin.flags
  return (
    <ActionDialog trigger={<>{t.edit}<span className="sr-only"> {label}</span></>} title={label} submitLabel={getMessages().admin.common.save} reason={false} method="PUT" path={`/api/admin/flags/${flagKey}`}
      fields={[
        { name: 'enabled', label: t.enabled, type: 'checkbox', defaultChecked: enabled },
        { name: 'plans', label: t.plans, type: 'checkboxes', hint: t.plansHint, options: planOptions, defaultValue: plans },
        { name: 'userIds', label: t.users, type: 'textarea', hint: t.usersHint, defaultValue: userIds.join('\n') },
      ]}
      toJson={(v) => ({ enabled: v.enabled === 'on', plans: v.plans ? v.plans.split(',') : [], userIds: (v.userIds ?? '').split(/[\s,]+/).filter(Boolean) })} />
  )
}

export function BannerEdit({ value }: { value: { active: boolean; message: string; tone: 'info' | 'warning'; href: string } }) {
  const t = getMessages().admin.flags
  return (
    <ActionDialog trigger={t.edit} title={t.banner} body={t.bannerBody} submitLabel={getMessages().admin.common.save} reason={false} method="PUT" path="/api/admin/settings/announcement"
      fields={[
        { name: 'active', label: t.bannerOn, type: 'checkbox', defaultChecked: value.active },
        { name: 'message', label: t.message, type: 'textarea', defaultValue: value.message },
        { name: 'tone', label: t.tone, type: 'select', defaultValue: value.tone, options: (['info', 'warning'] as const).map((x) => ({ value: x, label: t.tones[x] })) },
        { name: 'href', label: t.link, type: 'text', hint: t.linkHint, defaultValue: value.href },
      ]}
      toJson={(v) => ({ active: v.active === 'on', message: v.message, tone: v.tone, href: v.href })} />
  )
}

export function MaintenanceToggle({ active, message }: { active: boolean; message: string }) {
  const t = getMessages().admin.flags
  const label = active ? t.maintenanceOff : t.maintenanceOn
  return (
    <ActionDialog trigger={label} title={label} body={t.maintenanceBody} submitLabel={label} tone={active ? 'primary' : 'danger'} triggerClass={active ? 'm-btn primary sm' : 'm-btn danger sm'} path="/api/admin/settings/maintenance" method="PUT"
      fields={active ? [] : [{ name: 'message', label: t.maintenanceMessage, type: 'textarea', defaultValue: message }]}
      toJson={(v) => ({ active: !active, message: active ? message : v.message, reason: v.reason })} />
  )
}

export function KeyActions({ id, prefix, limit, revoked }: { id: string; prefix: string; limit: number; revoked: boolean }) {
  const t = getMessages().admin.developers
  if (revoked) return null
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <ActionDialog trigger={<>{t.editLimit}<span className="sr-only"> {prefix}</span></>} title={`${t.editLimit}: ${prefix}`} submitLabel={getMessages().admin.common.save} method="PATCH" path={`/api/admin/keys/${id}`}
        fields={[{ name: 'rateLimitPerMinute', label: t.rateLimit, type: 'number', defaultValue: String(limit), required: true }]}
        toJson={(v) => ({ rateLimitPerMinute: Number(v.rateLimitPerMinute), reason: v.reason })} triggerClass="m-btn ghost sm" />
      <ActionDialog trigger={<>{t.revoke}<span className="sr-only"> {prefix}</span></>} title={`${t.revoke}: ${prefix}`} body={t.revokeBody} submitLabel={t.revoke} tone="danger" method="DELETE" path={`/api/admin/keys/${id}`} triggerClass="m-btn ghost sm" />
    </div>
  )
}

/** Sends the chosen template to the signed-in staff member's own address. */
export function TestEmailButton({ templateKey }: { templateKey: string }) {
  const t = getMessages().admin.system
  const call = useAdminApi()
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | string>('idle')
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="m-btn secondary sm" aria-busy={state === 'busy'} disabled={state === 'busy'} onClick={async () => {
        setState('busy')
        try { await call(`/api/admin/emails/${templateKey}/test`, { method: 'POST', json: {} }); setState('sent') }
        catch (e) { setState(e instanceof ApiClientError ? e.message : getMessages().app.common.networkError) }
      }}>{t.sendTest}<span className="sr-only"> ({templateKey})</span></button>
      <span role="status" className="text-[13px] text-[var(--text-muted)]">{state === 'sent' ? t.testSent : state === 'idle' || state === 'busy' ? '' : state}</span>
    </span>
  )
}
