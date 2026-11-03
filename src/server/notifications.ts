import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'
import { env } from '@/server/env'
import { newId } from '@/server/ids'
import { sendEmail } from '@/server/email'
import { getMessages, fmt } from '@/i18n'

type JobLike = { id: string; type: string; userId: string | null; input: Record<string, unknown> }

/** In-app notification plus email (if the user wants job emails). Short jobs stay quiet. */
export async function notifyJobFinished(job: JobLike, ok: boolean, reason?: string): Promise<void> {
  if (!job.userId) return
  const db = getDb()
  const [u] = await db.select({ email: schema.user.email, name: schema.user.name }).from(schema.user).where(eq(schema.user.id, job.userId))
  if (!u) return
  const t = getMessages('en').app.jobs
  const moduleName = (t.types as Record<string, string>)[job.type] ?? job.type
  const named = [job.input.title, job.input.filename].find((x) => typeof x === 'string' && x)
  const title = typeof named === 'string' ? named.replace(/\.[a-z0-9]{2,4}$/i, '') : moduleName
  const url = `${env().APP_URL}/app/jobs/${job.id}`
  await db.insert(schema.notification).values({
    id: newId('ntf'), userId: job.userId, type: ok ? 'job.succeeded' : 'job.failed',
    title: fmt(ok ? t.doneTitle : t.failedTitle, { module: moduleName, title }), body: ok ? t.doneBody : fmt(t.failedBody, { reason: reason ?? '' }), href: `/app/jobs/${job.id}`,
  })
  if (!LONG_JOBS.has(job.type)) return
  const [pref] = await db.select().from(schema.notificationPref).where(eq(schema.notificationPref.userId, job.userId))
  if (pref && !pref.jobEmails) return
  const m = getMessages('en').emails
  const tpl = ok ? m.jobDone : m.jobFailed
  const v = { name: u.name, module: moduleName, title, url, reason: reason ?? '' }
  await sendEmail({ to: u.email, subject: fmt(tpl.subject, v), text: `${fmt(tpl.body, v)}\n\n${m.footer}`, tag: ok ? 'jobDone' : 'jobFailed' })
}

/** Jobs long enough that people leave the page; these also send an email. */
export const LONG_JOBS = new Set(['dub_prepare', 'dub_render', 'stt', 'clone_professional', 'studio_export', 'data_export'])
