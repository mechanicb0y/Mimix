import type { Metadata } from 'next'
import { UsageSettings } from '@/components/app/settings/UsageSettings'
import { getAppContext } from '@/server/app-context'
import { can } from '@/server/workspaces'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.settings.nav.usage }

export default async function UsagePage() {
  const ctx = await getAppContext('/app/settings/usage')
  return <UsageSettings canListKeys={can(ctx.workspace.role, 'manageApiKeys')} />
}
