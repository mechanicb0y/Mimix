import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { CenteredCard } from '@/components/admin/CenteredCard'
import { UnlockForm } from '@/components/admin/UnlockForm'
import { checkAdmin } from '@/server/admin/guard'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().admin.reauth.lockedTitle }

/** The idle lock screen: password (and 2FA code) to continue. */
export default async function UnlockPage({ searchParams }: PageProps<'/admin/unlock'>) {
  const r = await checkAdmin(await headers(), { allowLocked: true, touch: false })
  if (!r.ok) {
    if (r.reason === 'signed_out') redirect('/sign-in?next=/admin')
    if (r.reason === 'two_factor') redirect('/admin/two-factor')
    notFound()
  }
  const raw = (await searchParams).next
  const next = typeof raw === 'string' && raw.startsWith('/admin') && !raw.startsWith('//') ? raw : '/admin'
  const t = getMessages().admin.reauth
  return (
    <CenteredCard title={t.lockedTitle} body={t.lockedBody}>
      <UnlockForm next={next} />
    </CenteredCard>
  )
}
