import type { Metadata } from 'next'
import { AppShell } from '@/components/app/shell/AppShell'
import { getAppContext } from '@/server/app-context'
import { getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { default: getMessages().app.home.seoTitle, template: '%s · Mimix' }, robots: { index: false, follow: false } }

export default async function AppLayout({ children }: LayoutProps<'/app'>) {
  const ctx = await getAppContext()
  return <AppShell ctx={ctx}>{children}</AppShell>
}
