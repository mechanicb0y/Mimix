'use client'
import Link from 'next/link'
import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { JobState } from '@/lib/api-client'
import { jobTarget } from '@/lib/job-target'
import { getMessages, fmt } from '@/i18n'

export interface ListedJob extends JobState { title: string | null; ref: string | null; createdAt: string; finishedAt: string | null }
interface JobsApi { jobs: ListedJob[]; track(job: Pick<JobState, 'id'> & Partial<ListedJob>): void; refresh(): void }

const Ctx = createContext<JobsApi | null>(null)
/** The workspace's running jobs; null outside the app shell. */
export function useJobs(): JobsApi | null { return useContext(Ctx) }

export const isActive = (j: { status: string }) => j.status === 'queued' || j.status === 'running'
/** Poll quickly while something runs, slowly otherwise (and always when the tab comes back). */
export const POLL_ACTIVE_MS = 2000
export const POLL_IDLE_MS = 20_000
const SEEN_KEY = 'mimix.jobs.seen'

export function jobLabel(j: { type: string; title: string | null }) {
  const t = getMessages().app.jobs
  const kind = (t.types as Record<string, string>)[j.type] ?? j.type
  return { kind, name: j.title || kind }
}

interface Toast { id: string; text: string; href: string | null; ok: boolean }

/**
 * Follows the workspace's jobs from the server, so work started on any page (or before the tab was
 * closed) shows in the header with its progress, and each one announces itself when it finishes.
 */
export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<ListedJob[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const jobsRef = useRef<ListedJob[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Jobs this browser saw running. Kept for the session, so a reload still announces them.
  const seen = useRef<Set<string>>(new Set())
  const announced = useRef<Set<string>>(new Set())
  useEffect(() => {
    try { for (const id of JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]') as string[]) seen.current.add(id) } catch { /* storage blocked */ }
  }, [])
  const remember = () => { try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen.current].slice(-50))) } catch { /* storage blocked */ } }

  const announce = useCallback((j: ListedJob) => {
    const t = getMessages().app.jobs
    const { name } = jobLabel(j)
    const ok = j.status === 'succeeded'
    if (j.status === 'canceled') return
    const text = fmt(ok ? t.doneTitle : t.failedTitle, { title: name })
    const href = jobTarget(j)
    setToasts((ts) => [...ts.filter((x) => x.id !== j.id), { id: j.id, text, href, ok }].slice(-3))
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== j.id)), 10_000)
    window.dispatchEvent(new CustomEvent('mimix:job-finished', { detail: { id: j.id } }))
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState === 'hidden') {
        const n = new Notification(text, { body: ok ? t.doneBody : (j.error ?? ''), tag: j.id })
        n.onclick = () => { window.focus(); if (href) window.location.assign(href) }
      }
    } catch { /* notifications unavailable */ }
  }, [])

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/jobs?recent=1&limit=20', { cache: 'no-store' })
      if (!r.ok) return
      const items = (await r.json()).items as ListedJob[]
      for (const j of items) {
        if (isActive(j)) seen.current.add(j.id)
        else if (seen.current.has(j.id) && !announced.current.has(j.id)) { announced.current.add(j.id); seen.current.delete(j.id); announce(j) }
      }
      remember()
      jobsRef.current = items
      setJobs(items)
    } catch { /* offline: try again on the next tick */ }
  }, [announce])

  const again = useRef<(ms: number) => void>(() => {})
  const schedule = useCallback((ms: number) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      await load()
      again.current(jobsRef.current.some(isActive) ? POLL_ACTIVE_MS : POLL_IDLE_MS)
    }, ms)
  }, [load])
  useEffect(() => { again.current = schedule }, [schedule])

  useEffect(() => {
    schedule(0)
    const wake = () => { if (document.visibilityState === 'visible') schedule(0) }
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('focus', wake)
    return () => { if (timer.current) clearTimeout(timer.current); document.removeEventListener('visibilitychange', wake); window.removeEventListener('focus', wake) }
  }, [schedule])

  const api = useMemo<JobsApi>(() => ({
    jobs,
    track(j) {
      seen.current.add(j.id); remember()
      if (!jobsRef.current.some((x) => x.id === j.id)) {
        const row: ListedJob = { type: '', status: 'queued', progress: 0, message: null, output: null, error: null, title: null, ref: null, createdAt: new Date().toISOString(), finishedAt: null, ...j }
        jobsRef.current = [row, ...jobsRef.current]
        setJobs(jobsRef.current)
      }
      schedule(POLL_ACTIVE_MS)
    },
    refresh() { schedule(0) },
  }), [jobs, schedule])

  const t = getMessages().app.jobs
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[var(--z-toast,60)] grid w-[min(380px,calc(100vw-32px))] gap-2" role="status" aria-live="polite">
        {toasts.map((x) => (
          <div key={x.id} className="m-card pointer-events-auto flex items-start gap-3 p-3 shadow-lg" data-tone={x.ok ? 'success' : 'error'}>
            <p className="flex-1 text-[14px]">
              <span className={x.ok ? 'font-semibold' : 'font-semibold text-[var(--danger)]'}>{x.text}</span>
              {x.href ? <> <Link href={x.href} className="link" onClick={() => setToasts((ts) => ts.filter((y) => y.id !== x.id))}>{t.open}</Link></> : null}
            </p>
            <button type="button" className="m-btn ghost icon sm" aria-label={t.dismiss} onClick={() => setToasts((ts) => ts.filter((y) => y.id !== x.id))}><X aria-hidden="true" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
