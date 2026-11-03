import type { Metadata } from 'next'
import { Suspense } from 'react'
import { BillingSettings } from '@/components/app/settings/BillingSettings'
import { getAppContext } from '@/server/app-context'
import { can } from '@/server/workspaces'
import { getMessages } from '@/i18n'
import { currentPlans } from '@/config/plans'

export const metadata: Metadata = { title: getMessages().app.settings.nav.billing }

export default async function BillingPage() {
  const ctx = await getAppContext('/app/settings/billing')
  return <Suspense><BillingSettings canManage={can(ctx.workspace.role, 'manageBilling')} plans={currentPlans()} /></Suspense>
}
