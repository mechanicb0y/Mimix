'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'

interface Status { announcement: { message: string; tone: 'info' | 'warning'; href: string | null } | null; maintenance: { message: string } | null }

/**
 * The site banner and maintenance notice set in the admin console. Marketing pages are static, so
 * this asks /api/status after load; it renders nothing until there is something to say.
 */
/** Labels come from the server so the whole message catalogue stays out of the page's JavaScript. */
export function SiteStatus({ labels }: { labels: { learnMore: string; maintenance: string } }) {
  const [s, setS] = useState<Status | null>(null)
  useEffect(() => {
    let live = true
    fetch('/api/status').then((r) => (r.ok ? r.json() : null)).then((d) => { if (live && d) setS(d) }).catch(() => {})
    return () => { live = false }
  }, [])
  const items: Array<{ key: string; tone: 'info' | 'warning'; text: string; href?: string | null }> = []
  if (s?.maintenance) items.push({ key: 'm', tone: 'warning', text: s.maintenance.message || labels.maintenance })
  if (s?.announcement) items.push({ key: 'a', tone: s.announcement.tone, text: s.announcement.message, href: s.announcement.href })
  if (!items.length) return null
  return (
    <>
      {items.map((i) => (
        <div key={i.key} role={i.tone === 'warning' ? 'alert' : 'status'} className="border-b border-[var(--border)] bg-[var(--surface-2)]">
          <div className="container-content flex items-start gap-3 py-2.5 text-[14px]">
            {i.tone === 'warning' ? <AlertTriangle aria-hidden="true" size={18} className="mt-0.5 flex-none text-[var(--warning)]" /> : <Info aria-hidden="true" size={18} className="mt-0.5 flex-none text-[var(--accent)]" />}
            <p className="min-w-0">{i.text}{i.href ? <> <a href={i.href} className="link">{labels.learnMore}</a></> : null}</p>
          </div>
        </div>
      ))}
    </>
  )
}
