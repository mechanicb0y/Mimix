'use client'
import { useEffect, useRef, useState } from 'react'
import { api, followJob, type JobState } from '@/lib/api-client'
import { useJobs } from '@/components/app/jobs/JobsProvider'

/**
 * Follows one job over SSE. Call start(job) after creating it; cancel() asks the server to stop it.
 * With `resume`, a page picks up its own job that is still running on the server (after the person
 * went to another page, reloaded or closed the tab), and shows its progress again.
 */
export function useJob(onDone?: (job: JobState) => void, opts?: { resume?: { types: string[]; ref?: string | null } }) {
  const [job, setJob] = useState<JobState | null>(null)
  const stop = useRef<(() => void) | null>(null)
  const done = useRef(onDone)
  const jobs = useJobs()
  const tracker = useRef(jobs)
  useEffect(() => { done.current = onDone; tracker.current = jobs })
  useEffect(() => () => stop.current?.(), [])

  const follow = (j: Pick<JobState, 'id'> & Partial<JobState>) => {
    stop.current?.()
    setJob({ type: '', status: 'queued', progress: 0, message: null, output: null, error: null, ...j })
    tracker.current?.track(j)
    stop.current = followJob(j.id, (next) => {
      setJob(next)
      if (next.status !== 'queued' && next.status !== 'running') { done.current?.(next); tracker.current?.refresh() }
    })
  }

  const resumeKey = opts?.resume ? `${opts.resume.types.join(',')}|${opts.resume.ref ?? ''}` : ''
  useEffect(() => {
    if (!resumeKey) return
    const [types, ref] = resumeKey.split('|')
    let off = false
    void (async () => {
      const q = new URLSearchParams({ type: types!, limit: '1' })
      if (ref) q.set('ref', ref)
      const r = await api<{ items: JobState[] }>(`/api/v1/jobs?${q}`).catch(() => null)
      const j = r?.items[0]
      if (!off && j && !stop.current) follow(j)
    })()
    return () => { off = true }
  }, [resumeKey])

  return {
    job,
    active: !!job && (job.status === 'queued' || job.status === 'running'),
    start(j: string | (Pick<JobState, 'id'> & Partial<JobState>)) { follow(typeof j === 'string' ? { id: j } : j) },
    async cancel() { if (job) { await api(`/api/v1/jobs/${job.id}`, { method: 'DELETE' }).catch(() => {}); tracker.current?.refresh() } },
    reset() { stop.current?.(); stop.current = null; setJob(null) },
  }
}
