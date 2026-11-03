'use client'
import { ActionDialog } from './ActionDialog'
import { fmt, getMessages } from '@/i18n'

/** Take down / dismiss reports for one voice. */
export function VoiceModeration({ voiceId, hasOpenReports, takenDown }: { voiceId: string; hasOpenReports: boolean; takenDown: boolean }) {
  const t = getMessages().admin.voices
  return (
    <div className="flex flex-wrap gap-2">
      {hasOpenReports ? <ActionDialog trigger={t.dismiss} title={t.dismiss} body={t.dismissBody} submitLabel={t.dismiss} path={`/api/admin/voices/${voiceId}/dismiss`} /> : null}
      {!takenDown ? <ActionDialog trigger={t.takedown} title={t.takedown} body={t.takedownBody} submitLabel={t.takedown} tone="danger" triggerClass="m-btn danger sm" path={`/api/admin/voices/${voiceId}/takedown`} /> : null}
    </div>
  )
}

/** Approve or reject a request to list a voice in the public library. */
export function PublishDecision({ voiceId }: { voiceId: string }) {
  const t = getMessages().admin.voices
  const path = `/api/admin/voices/${voiceId}/publish`
  return (
    <div className="flex flex-wrap gap-2">
      <ActionDialog trigger={t.approve} title={t.approve} submitLabel={t.approve} reason={false} path={path}
        fields={[{ name: 'note', label: t.note, type: 'textarea' }]} toJson={(v) => ({ decision: 'approved', note: v.note })} triggerClass="m-btn primary sm" />
      <ActionDialog trigger={t.reject} title={t.reject} body={t.rejectBody} submitLabel={t.reject} reason={false} tone="danger" path={path}
        fields={[{ name: 'note', label: t.note, type: 'textarea', required: true }]} toJson={(v) => ({ decision: 'rejected', note: v.note })} />
    </div>
  )
}

export function BlocklistAdd() {
  const t = getMessages().admin.voices
  return (
    <ActionDialog trigger={t.add} title={t.add} submitLabel={t.add} reason={false} path="/api/admin/blocklist" triggerClass="m-btn primary sm"
      fields={[
        { name: 'name', label: t.blockName, type: 'text', required: true },
        { name: 'aliases', label: t.blockAliases, type: 'text', hint: t.blockAliasesHint },
        { name: 'reason', label: t.blockReason, type: 'select', defaultValue: 'public_figure', options: (['public_figure', 'taken_down', 'other'] as const).map((r) => ({ value: r, label: t.blockReasons[r] })) },
      ]}
      toJson={(v) => ({ name: v.name, aliases: (v.aliases ?? '').split(',').map((s) => s.trim()).filter(Boolean), reason: v.reason })} />
  )
}

export function BlocklistRemove({ id, name }: { id: string; name: string }) {
  const t = getMessages().admin.voices
  return <ActionDialog trigger={t.remove} title={fmt(t.removeTitle, { name })} submitLabel={t.remove} reason={false} tone="danger" method="DELETE" path={`/api/admin/blocklist/${id}`} triggerClass="m-btn ghost sm" />
}

/** Mark an abuse report actioned or dismissed. */
export function ReportDecision({ reportId }: { reportId: string }) {
  const t = getMessages().admin.generations
  const path = `/api/admin/reports/${reportId}`
  return (
    <div className="flex flex-wrap gap-2">
      <ActionDialog trigger={t.action} title={t.action} submitLabel={t.action} path={path} toJson={(v) => ({ status: 'actioned', reason: v.reason })} />
      <ActionDialog trigger={t.dismiss} title={t.dismiss} submitLabel={t.dismiss} path={path} toJson={(v) => ({ status: 'dismissed', reason: v.reason })} triggerClass="m-btn ghost sm" />
    </div>
  )
}

export function GenerationFlag({ id, flagged }: { id: string; flagged: boolean }) {
  const t = getMessages().admin.generations
  const label = flagged ? t.unflag : t.flag
  return <ActionDialog trigger={label} title={label} body={flagged ? undefined : t.flagBody} submitLabel={label} path={`/api/admin/generations/${id}/flag`} toJson={(v) => ({ flagged: !flagged, reason: v.reason })} />
}
