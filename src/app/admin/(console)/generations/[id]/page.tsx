import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/server/admin/guard'
import { generationDetail } from '@/server/admin/moderation'
import { adminCan } from '@/config/admin'
import { GenerationFlag, ReportDecision } from '@/components/admin/ModerationActions'
import { Empty, Facts, PageHeader, Section, StateBadge, TableWrap, When, moduleLabel } from '@/components/admin/ui'
import { formatNumber, getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: getMessages().admin.nav.generations }

export default async function AdminGeneration({ params }: PageProps<'/admin/generations/[id]'>) {
  const { id } = await params
  const actor = await requireAdminPage('viewGenerations', `/admin/generations/${id}`)
  const d = await generationDetail(id)
  if (!d) notFound()
  const a = getMessages().admin
  const t = a.generations
  const g = d.generation
  const mod = adminCan(actor.role, 'moderateGenerations')
  return (
    <>
      <p className="mb-2 text-[14px]"><Link href="/admin/generations">{t.title}</Link></p>
      <PageHeader title={`${moduleLabel(g.module)} · ${g.id}`} actions={mod ? <GenerationFlag id={g.id} flagged={g.flagged} /> : null} />
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="m-card p-4 sm:p-6">
          <Facts items={[
            [a.common.status, <StateBadge key="s" state={g.status} />],
            [t.flagged, g.flagged ? a.common.yes : a.common.no],
            [a.common.when, <When key="w" date={g.createdAt} />],
            [a.common.email, d.user ? <Link key="u" href={`/admin/users/${d.user.id}`}>{d.user.email}</Link> : '—'],
            [a.common.workspace, <code key="ws" className="text-[13px]">{g.workspaceId}</code>],
            [a.voices.title, d.voice ? <Link key="v" href={`/admin/voices/${d.voice.id}`}>{d.voice.name}</Link> : '—'],
            [t.via, g.apiKeyId ? `${t.viaApi} (${g.apiKeyId})` : t.viaApp],
            [a.common.credits, formatNumber(g.credits)],
            ...(g.error ? [[t.error, g.error] as [string, string]] : []),
          ]} />
        </div>
        <div className="m-card p-4">
          <p className="m-label">{t.output}</p>
          {d.audio ? <audio controls preload="none" src={d.audio} className="w-full" aria-label={t.output} /> : <p className="text-[14px] text-[var(--text-muted)]">{a.common.none}</p>}
        </div>
      </div>
      <Section title={t.input}>
        <pre className="m-card max-h-[360px] overflow-auto whitespace-pre-wrap break-words p-4 text-[13px]" tabIndex={0}>{JSON.stringify(g.input, null, 2)}</pre>
      </Section>
      <Section title={t.tabs.reports}>
        {d.reports.length ? (
          <TableWrap label={t.tabs.reports}>
            <table className="app-table">
              <thead><tr><th scope="col">{a.common.when}</th><th scope="col">{t.report}</th><th scope="col">{t.reporter}</th><th scope="col">{a.common.status}</th><th scope="col"><span className="sr-only">{a.common.actions}</span></th></tr></thead>
              <tbody>
                {d.reports.map((r) => (
                  <tr key={r.id}>
                    <td><When date={r.createdAt} /></td>
                    <td className="max-w-[420px]"><strong>{r.reason}</strong>{r.details ? <p className="text-[14px] text-[var(--text-muted)]">{r.details}</p> : null}</td>
                    <td className="break-all">{r.reporterEmail ?? t.anonymous}</td>
                    <td><StateBadge state={r.status === 'open' ? 'pending' : r.status} label={t.reportStatuses[r.status]} /></td>
                    <td>{mod && r.status === 'open' ? <ReportDecision reportId={r.id} /> : null}</td>
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
