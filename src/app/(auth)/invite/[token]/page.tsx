import type { Metadata } from 'next'
import Link from 'next/link'
import { MailX, Users } from 'lucide-react'
import { AcceptInvite } from '@/components/app/settings/AcceptInvite'
import { peekInvite } from '@/server/modules/team'
import { getSession } from '@/server/session'
import { getMessages, fmt } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Invite', robots: { index: false, follow: false } }

export default async function InvitePage({ params }: PageProps<'/invite/[token]'>) {
  const { token } = await params
  const t = getMessages().app.settings.invite
  const roles = getMessages().app.settings.team.roles
  const inv = await peekInvite(token)
  if (!inv) {
    return (
      <div>
        <span className="icon-tile mb-4"><MailX aria-hidden="true" size={20} /></span>
        <h1 className="text-[28px] leading-9 font-bold">{t.invalidTitle}</h1>
        <p className="mt-3 text-[var(--text-muted)]">{t.invalidBody}</p>
        <Link href="/app" className="m-btn primary mt-6">{t.home}</Link>
      </div>
    )
  }
  const session = await getSession()
  const next = `/invite/${token}`
  return (
    <div>
      <span className="icon-tile mb-4"><Users aria-hidden="true" size={20} /></span>
      <h1 className="text-[28px] leading-9 font-bold">{fmt(t.title, { workspace: inv.workspace })}</h1>
      <p className="mt-3 text-[var(--text-muted)]">{fmt(t.body, { role: roles[inv.role].toLowerCase(), email: inv.email })}</p>
      {session ? <AcceptInvite token={token} workspace={inv.workspace} /> : (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="m-btn primary">{t.signIn}</Link>
          <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className="m-btn secondary">{t.signUp}</Link>
        </div>
      )}
    </div>
  )
}
