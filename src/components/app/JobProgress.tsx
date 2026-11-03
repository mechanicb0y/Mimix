'use client'
import type { JobState } from '@/lib/api-client'
import { getMessages, fmt } from '@/i18n'
import { FormMessage } from '@/components/app/Field'

/** Progress bar, status text and cancel for a queued or running job; the error when it failed. */
export function JobProgress({ job, onCancel }: { job: JobState | null; onCancel?: () => void }) {
  const t = getMessages().app.job
  if (!job) return null
  if (job.status === 'failed') return <FormMessage>{job.error}</FormMessage>
  if (job.status === 'canceled') return <FormMessage tone="info">{t.canceled}</FormMessage>
  if (job.status === 'succeeded') return null
  const label = job.status === 'queued' ? t.queued : fmt(t.running, { percent: job.progress })
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-[14px]">
        <span role="status" aria-live="polite">{label}</span>
        {onCancel ? <button type="button" className="m-btn ghost sm" onClick={onCancel}>{t.cancel}</button> : null}
      </div>
      <progress className="h-2 w-full" max={100} value={job.progress} aria-label={label} />
      <p className="text-[13px] text-[var(--text-muted)]">{getMessages().app.jobs.leaveHint}</p>
    </div>
  )
}
