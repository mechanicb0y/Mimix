import 'server-only'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { env } from '@/server/env'
import { newId } from '@/server/ids'

export interface Email { to: string; subject: string; text: string; html?: string; tag: string }

/**
 * Sends transactional email. "outbox" (default) writes each message as JSON to .data/outbox, which
 * tests read to follow verification and reset links. "resend" sends through the Resend HTTP API.
 */
export async function sendEmail(mail: Email): Promise<void> {
  const e = env()
  if (e.EMAIL_DRIVER === 'resend') {
    if (!e.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set')
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: e.EMAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html, tags: [{ name: 'type', value: mail.tag }] }),
    })
    if (!res.ok) throw new Error(`Email send failed: ${res.status}`)
    return
  }
  const dir = outboxDir()
  await mkdir(dir, { recursive: true })
  const id = newId('mail')
  await writeFile(join(dir, `${Date.now()}-${id}.json`), JSON.stringify({ id, from: e.EMAIL_FROM, ...mail, sentAt: new Date().toISOString() }, null, 2))
}

function outboxDir() { return join(env().MIMIX_DATA_DIR, 'outbox') }

/** Reads the local outbox, newest first (development and tests only). */
export async function readOutbox(filter?: { to?: string; tag?: string }): Promise<Array<Email & { id: string; sentAt: string }>> {
  let files: string[] = []
  try { files = await readdir(outboxDir()) } catch { return [] }
  const mails = await Promise.all(files.filter((f) => f.endsWith('.json')).map(async (f) => JSON.parse(await readFile(join(outboxDir(), f), 'utf8'))))
  return mails
    .filter((m) => (!filter?.to || m.to === filter.to) && (!filter?.tag || m.tag === filter.tag))
    .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))
}
