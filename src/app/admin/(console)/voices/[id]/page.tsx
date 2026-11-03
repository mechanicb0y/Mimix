import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/server/admin/guard'
import { voiceDetail } from '@/server/admin/moderation'
import { PublishDecision, ReportDecision, VoiceModeration } from '@/components/admin/ModerationActions'
import { Empty, Facts, PageHeader, Section, StateBadge, TableWrap, When } from '@/components/admin/ui'
import { formatNumber, getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: getMessages().admin.nav.voices }

export default async function AdminVoice({ params }: PageProps<'/admin/voices/[id]'>) {
  const { id } = await params
  await requireAdminPage('moderateVoices', `/admin/voices/${id}`)
  const d = await voiceDetail(id)
  if (!d) notFound()
  const a = getMessages().admin
  const t = a.voices
  const v = d.voice
  const open = d.reports.filter((r) => r.status === 'open')
  const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`)
  return (
    <>
      <p className="mb-2 text-[14px]"><Link href="/admin/voices">{t.title}</Link></p>
      <PageHeader title={v.name} body={v.description ?? undefined} actions={<VoiceModeration voiceId={v.id} hasOpenReports={open.length > 0} takenDown={v.status === 'taken_down'} />} />
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="m-card p-4 sm:p-6">
          <Facts items={[
            [a.common.id, <code key="id" className="text-[13px]">{v.id}</code>],
            [t.kind, v.kind],
            [a.common.status, <StateBadge key="s" state={v.status} />],
            [t.licence, v.licence],
            [t.owner, d.owner ? <Link key="o" href={`/admin/users/${d.owner.id}`}>{d.owner.email}</Link> : '—'],
            [a.common.created, <When key="c" date={v.createdAt} />],
            [t.samplesLabel, formatNumber(d.samples)],
          ]} />
          {v.publishStatus === 'pending' ? <div className="mt-4 border-t border-[var(--border)] pt-4"><PublishDecision voiceId={v.id} /></div> : null}
        </div>
        <div className="m-card p-4">
          <p className="m-label">{t.preview}</p>
          {d.preview ? <audio controls preload="none" src={d.preview} className="w-full" aria-label={`${t.preview}: ${v.name}`} /> : <p className="text-[14px] text-[var(--text-muted)]">{t.noPreview}</p>}
        </div>
      </div>

      <Section title={a.generations.tabs.reports}>
        {d.reports.length ? (
          <TableWrap label={a.generations.tabs.reports}>
            <table className="app-table">
              <thead><tr><th scope="col">{a.common.when}</th><th scope="col">{a.generations.report}</th><th scope="col">{a.generations.reporter}</th><th scope="col">{a.common.status}</th><th scope="col"><span className="sr-only">{a.common.actions}</span></th></tr></thead>
              <tbody>
                {d.reports.map((r) => (
                  <tr key={r.id}>
                    <td><When date={r.createdAt} /></td>
                    <td className="max-w-[420px]"><strong>{r.reason}</strong>{r.details ? <p className="text-[14px] text-[var(--text-muted)]">{r.details}</p> : null}</td>
                    <td className="break-all">{r.reporterEmail ?? a.generations.anonymous}</td>
                    <td><StateBadge state={r.status === 'open' ? 'pending' : r.status} label={a.generations.reportStatuses[r.status]} /></td>
                    <td>{r.status === 'open' ? <ReportDecision reportId={r.id} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : <Empty />}
      </Section>

      {d.sources.length ? (
        <Section title={t.lineage}>
          <ul className="grid gap-2">{d.sources.map((s) => <li key={s.id}><Link href={`/admin/voices/${s.id}`}>{s.name}</Link> · {Math.round(s.weight * 100)}% · <StateBadge state={s.status} /></li>)}</ul>
        </Section>
      ) : null}
      {d.mixes.length ? (
        <Section title={t.mixes}>
          <ul className="grid gap-2">{d.mixes.map((s) => <li key={s.id}><Link href={`/admin/voices/${s.id}`}>{s.name}</Link> · <StateBadge state={s.status} /></li>)}</ul>
        </Section>
      ) : null}

      <Section title={t.consents}>
        {d.consents.length ? (
          <TableWrap label={t.consents}>
            <table className="app-table">
              <thead><tr><th scope="col">{a.common.when}</th><th scope="col">{t.phrase}</th><th scope="col" className="text-right">{t.speakerScore}</th><th scope="col" className="text-right">{t.phraseScore}</th><th scope="col">{t.verified}</th><th scope="col">{t.audioHash}</th></tr></thead>
              <tbody>
                {d.consents.map((c) => (
                  <tr key={c.id}>
                    <td><When date={c.createdAt} /></td>
                    <td className="max-w-[320px]">{c.phrase}</td>
                    <td className="text-right tabular-nums">{pct(c.speakerScore)}</td>
                    <td className="text-right tabular-nums">{pct(c.phraseScore)}</td>
                    <td>{c.verified ? a.common.yes : a.common.no}</td>
                    <td><code className="break-all text-[12px]">{c.audioSha256 ?? '—'}</code></td>
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
