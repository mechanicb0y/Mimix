'use client'
import { ActionDialog } from './ActionDialog'
import { getMessages } from '@/i18n'

type Ws = { id: string; name: string; planId: string; stripeManaged: boolean }
export interface UserActionPerms { credits: boolean; plan: boolean; suspend: boolean; ban: boolean; twoFactor: boolean; role: boolean }

/** The actions on a user's page. Only the ones the signed-in role may use are passed in; the server checks again. */
export function UserActions({ userId, status, role, twoFactorEnabled, workspaces, perms, planOptions, isSelf }: {
  userId: string; status: string; role: string; twoFactorEnabled: boolean; workspaces: Ws[]; perms: UserActionPerms
  planOptions: Array<{ value: string; label: string }>; isSelf: boolean
}) {
  const a = getMessages().admin
  const t = a.users.actions
  const ws = workspaces.map((w) => ({ value: w.id, label: w.name }))
  const base = `/api/admin/users/${userId}`
  const wsField = { name: 'workspaceId', label: a.common.workspace, type: 'select' as const, options: ws, defaultValue: ws[0]?.value }
  const canBan = perms.ban && status !== 'banned'
  const canSuspend = perms.suspend && status === 'active'
  const canRestore = status !== 'active' && (status === 'banned' ? perms.ban : perms.suspend)
  if (isSelf) return null
  return (
    <div className="flex flex-wrap gap-2">
      {perms.credits && ws.length ? (
        <ActionDialog trigger={t.credits} title={t.credits} body={t.creditsBody} submitLabel={t.credits} path={`${base}/credits`}
          fields={[wsField, { name: 'amount', label: t.amount, type: 'number', hint: t.amountHint, required: true }]}
          toJson={(v) => ({ workspaceId: v.workspaceId, amount: Number(v.amount), reason: v.reason })} />
      ) : null}
      {perms.plan && ws.length ? (
        <ActionDialog trigger={t.plan} title={t.plan} body={t.planBody} submitLabel={t.plan} path={`${base}/plan`}
          fields={[wsField, { name: 'planId', label: a.common.plan, type: 'select', options: planOptions, defaultValue: workspaces[0]?.planId }, { name: 'until', label: t.until, type: 'date', hint: t.untilHint }]} />
      ) : null}
      {perms.twoFactor && twoFactorEnabled ? (
        <ActionDialog trigger={t.resetTwoFactor} title={t.resetTwoFactor} body={t.resetTwoFactorBody} submitLabel={t.resetTwoFactor} path={`${base}/two-factor`} />
      ) : null}
      {perms.role ? (
        <ActionDialog trigger={t.role} title={t.role} body={t.roleBody} submitLabel={t.role} path={`${base}/role`}
          fields={[{ name: 'role', label: t.newRole, type: 'select', defaultValue: role, options: (['user', 'support', 'moderator', 'admin', 'owner'] as const).map((r) => ({ value: r, label: a.roles[r] })) }]} />
      ) : null}
      {canRestore ? (
        <ActionDialog trigger={t.restore} title={t.restore} body={t.restoreBody} submitLabel={t.restore} path={`${base}/status`} toJson={(v) => ({ status: 'active', reason: v.reason })} />
      ) : null}
      {canSuspend ? (
        <ActionDialog trigger={t.suspend} title={t.suspend} body={t.suspendBody} submitLabel={t.suspend} tone="danger" path={`${base}/status`} toJson={(v) => ({ status: 'suspended', reason: v.reason })} />
      ) : null}
      {canBan ? (
        <ActionDialog trigger={t.ban} title={t.ban} body={t.banBody} submitLabel={t.ban} tone="danger" triggerClass="m-btn danger sm" path={`${base}/status`} toJson={(v) => ({ status: 'banned', reason: v.reason })} />
      ) : null}
    </div>
  )
}
