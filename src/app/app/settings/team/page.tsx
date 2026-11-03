import type { Metadata } from 'next'
import { TeamSettings } from '@/components/app/settings/TeamSettings'
import { getAppContext } from '@/server/app-context'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.settings.nav.team }

export default async function TeamPage() {
  const ctx = await getAppContext('/app/settings/team')
  return <TeamSettings me={ctx.user.id} myRole={ctx.workspace.role} />
}
