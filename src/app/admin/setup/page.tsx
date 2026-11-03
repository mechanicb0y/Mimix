import type { Metadata } from 'next'
import Link from 'next/link'
import { CenteredCard } from '@/components/admin/CenteredCard'
import { SetupForm } from '@/components/admin/SetupForm'
import { setupAvailable } from '@/server/admin/setup'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().admin.setup.title }

/** First deploy: the Owner chooses a password with ADMIN_SETUP_TOKEN. Works once. */
export default async function SetupPage() {
  const t = getMessages().admin.setup
  if (!(await setupAvailable())) {
    return (
      <CenteredCard title={t.unavailableTitle} body={t.unavailableBody}>
        <Link href="/sign-in?next=/admin" className="m-btn primary">{t.signIn}</Link>
      </CenteredCard>
    )
  }
  return <CenteredCard title={t.title} body={t.body}><SetupForm /></CenteredCard>
}
