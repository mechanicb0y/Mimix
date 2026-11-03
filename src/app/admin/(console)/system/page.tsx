import type { Metadata } from 'next'
import { requireAdminPage } from '@/server/admin/guard'
import { emailTemplates, systemStatus } from '@/server/admin/platform'
import { TestEmailButton } from '@/components/admin/PlatformActions'
import { Facts, PageHeader, Section, StateBadge, bytes } from '@/components/admin/ui'
import { fmt, formatNumber, getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: getMessages().admin.nav.system }

const CAPS = ['streaming', 'instantClone', 'professionalClone', 'mix', 'design', 'convert', 'transcribe', 'soundEffects', 'isolate'] as const

export default async function AdminSystem() {
  await requireAdminPage('viewSystem', '/admin/system')
  const a = getMessages().admin
  const t = a.system
  const s = await systemStatus()
  const e = s.engine
  const yes = CAPS.filter((c) => e.capabilities[c])
  const no = CAPS.filter((c) => !e.capabilities[c])
  const failRate = e.last24h.total ? e.last24h.failed / e.last24h.total : 0
  const templates = emailTemplates()
  return (
    <>
      <PageHeader title={t.title} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t.engine}>
          <div className="m-card p-4 sm:p-6">
            <Facts items={[
              [t.provider, e.isMock ? `${e.id} · ${t.preview}` : e.id],
              [a.common.status, <StateBadge key="c" state={e.configured ? 'active' : 'failed'} label={e.configured ? t.configured : t.notConfigured} />],
              [t.capabilities, yes.map((c) => t.caps[c]).join(', ') || '—'],
              [t.cannot, no.map((c) => t.caps[c]).join(', ') || '—'],
              [t.verifier, <StateBadge key="v" state={e.verifier.productionReady ? 'active' : 'pending'} label={`${e.verifier.model} · ${e.verifier.productionReady ? t.verifierReady : t.verifierStandIn}`} />],
              ...(e.verifier.kind === 'neural' ? [[t.verifierMatch, `${e.verifier.match} · ${e.verifier.tuned !== null ? fmt(t.verifierTuned, { detail: e.verifier.tuned || '—' }) : t.verifierDefault}`] as [string, string]] : []),
            ]} />
          </div>
        </Section>
        <Section title={t.health}>
          <div className="m-card p-4 sm:p-6">
            <Facts items={[
              [a.overview.errorRate, <span key="r"><StateBadge state={failRate > 0.05 ? 'failed' : failRate > 0.01 ? 'pending' : 'active'} label={`${(failRate * 100).toFixed(1)}%`} /> <span className="text-[var(--text-muted)]">{fmt(t.healthRuns, { failed: formatNumber(e.last24h.failed), total: formatNumber(e.last24h.total) })}</span></span>],
              [t.ping, e.ping ? <StateBadge key="p" state={e.ping.ok ? 'active' : 'failed'} label={fmt(e.ping.ok ? t.pingOk : t.pingFail, { ms: e.ping.ms, detail: e.ping.detail })} /> : t.pingNone],
              [t.queue, s.queue],
              [t.email, `${s.email.driver} · ${t.from}: ${s.email.from}`],
            ]} />
          </div>
        </Section>
      </div>
      <Section title={t.storage}>
        <div className="m-card p-4 sm:p-6">
          <Facts items={[
            [t.driver, s.storage.driver],
            [t.samples, `${formatNumber(s.storage.samples.count)} · ${bytes(s.storage.samples.bytes)}`],
            [t.uploads, `${formatNumber(s.storage.uploads.count)} · ${bytes(s.storage.uploads.bytes)}`],
            [t.outputs, formatNumber(s.storage.outputs)],
            ...(s.storage.driver === 'local' ? [[t.localSize, bytes(s.storage.localBytes)] as [string, string]] : []),
          ]} />
        </div>
      </Section>
      <Section title={t.templates}>
        <p className="mb-3 text-[14px] text-[var(--text-muted)]">{t.templatesBody}</p>
        <ul className="grid gap-3">
          {templates.map((tpl) => (
            <li key={tpl.key} className="m-card p-4">
              <details>
                <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span><code className="text-[13px] text-[var(--text-muted)]">{tpl.key}</code> · <span className="font-semibold">{tpl.subject}</span></span>
                </summary>
                <pre className="mt-3 whitespace-pre-wrap break-words text-[14px]">{tpl.body}</pre>
                <div className="mt-3"><TestEmailButton templateKey={tpl.key} /></div>
              </details>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
