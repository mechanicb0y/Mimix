import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { CenteredCard } from '@/components/admin/CenteredCard'
import { checkAdmin } from '@/server/admin/guard'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().admin.twoFactor.title }

/** Staff accounts must turn on 2FA before the console opens (first login of the super-admin included). */
export default async function TwoFactorRequired() {
  const r = await checkAdmin(await headers(), { allowWithout2fa: true, allowLocked: true, touch: false })
  if (!r.ok) {
    if (r.reason === 'signed_out') redirect('/sign-in?next=/admin')
    notFound()
  }
  const s = await (await import('@/server/auth')).getAuth().api.getSession({ headers: await headers() })
  if ((s?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled) redirect('/admin')
  const t = getMessages().admin.twoFactor
  return (
    <CenteredCard title={t.title} body={t.body}>
      <Link href="/app/settings/security" className="m-btn primary">{t.cta}</Link>
      <p className="text-[14px] text-[var(--text-muted)]">{t.after}</p>
    </CenteredCard>
  )
}
