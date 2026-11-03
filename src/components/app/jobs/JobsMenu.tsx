'use client'
import Link from 'next/link'
import { Popover } from 'radix-ui'
import { ListChecks, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { jobTarget } from '@/lib/job-target'
import { getMessages, fmt } from '@/i18n'
import { isActive, jobLabel, useJobs } from './JobsProvider'

/** Header button: what's running now, with progress, and what finished in the last 15 minutes. */
export function JobsMenu() {
  const jobs = useJobs()
  const t = getMessages().app.jobs
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('unsupported')
  useEffect(() => {
    const id = requestAnimationFrame(() => setPerm(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission))
    return () => cancelAnimationFrame(id)
  }, [])
  if (!jobs) return null
  const running = jobs.jobs.filter(isActive)
  const label = running.length ? fmt(t.menuRunning, { count: running.length }) : t.menu
  return (
    <Popover.Root onOpenChange={(o) => { if (o) jobs.refresh() }}>
      <Popover.Trigger className="m-btn ghost sm relative" aria-label={label} data-testid="jobs-menu">
        {running.length ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ListChecks aria-hidden="true" />}
        {running.length ? <span aria-hidden="true" className="tabular-nums">{running.length}</span> : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="app-menu w-[min(380px,calc(100vw-32px))] p-0" sideOffset={8} align="end">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-[15px] font-semibold">{t.menu}</h2>
            <p className="text-[13px] text-[var(--text-muted)]">{t.menuHint}</p>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {jobs.jobs.length === 0 ? <li className="px-4 py-6 text-[14px] text-[var(--text-muted)]">{t.menuEmpty}</li> : jobs.jobs.map((j) => {
              const { kind, name } = jobLabel(j)
              const href = jobTarget(j)
              const live = isActive(j)
              return (
                <li key={j.id} className="grid gap-2 border-b border-[var(--border)] px-4 py-3 last:border-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 text-[14px]">
                      <span className="font-semibold">{kind}</span>
                      {name !== kind ? <span className="block truncate text-[13px] text-[var(--text-muted)]">{name}</span> : null}
                    </p>
                    <span className={`shrink-0 text-[13px] ${j.status === 'failed' ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
                      {j.status === 'running' ? fmt(t.progress, { percent: j.progress }) : t.status[j.status]}
                    </span>
                  </div>
                  {live ? <progress className="h-1.5 w-full" max={100} value={j.progress} aria-label={fmt(t.progressOf, { module: kind, percent: j.progress })} /> : null}
                  <div className="flex gap-3 text-[13px]">
                    {href ? <Link href={href} className="link">{t.open}</Link> : null}
                    {live ? <button type="button" className="link" onClick={async () => { await api(`/api/v1/jobs/${j.id}`, { method: 'DELETE' }).catch(() => {}); jobs.refresh() }}>{t.cancel}</button> : null}
                  </div>
                </li>
              )
            })}
          </ul>
          {perm === 'default' ? (
            <div className="border-t border-[var(--border)] px-4 py-3">
              <button type="button" className="link text-[13px]" onClick={async () => { try { setPerm(await Notification.requestPermission()) } catch { /* blocked */ } }}>{t.desktopOn}</button>
            </div>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
