import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/server/app-context'
import { getJob } from '@/server/jobs'
import { getMessages, fmt } from '@/i18n'
import { jobTarget as targetOf } from '@/lib/job-target'

export const metadata: Metadata = { title: getMessages().app.jobs.pageTitle }

export default async function JobPage({ params }: PageProps<'/app/jobs/[id]'>) {
  const { id } = await params
  const ctx = await getAppContext(`/app/jobs/${id}`)
  const t = getMessages().app.jobs
  const j = await getJob(id, ctx.workspace.id)
  const target = j ? targetOf(j) : null
  if (target) redirect(target)
  return (
    <div className="mx-auto grid max-w-[720px] gap-4">
      <h1 className="app-page-title">{t.pageTitle}</h1>
      <p className="m-card p-4 sm:p-6">
        {j ? fmt(t.statusLine, { module: (t.types as Record<string, string>)[j.type] ?? j.type, status: t.status[j.status] }) : t.notFound}
      </p>
      <Link href="/app" className="m-btn secondary justify-self-start">{t.home}</Link>
    </div>
  )
}
