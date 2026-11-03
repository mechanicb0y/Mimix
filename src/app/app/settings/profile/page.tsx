import type { Metadata } from 'next'
import { ProfileSettings } from '@/components/app/settings/ProfileSettings'
import { getAppContext } from '@/server/app-context'
import { can } from '@/server/workspaces'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.settings.nav.profile }

export default async function ProfilePage() {
  const ctx = await getAppContext('/app/settings/profile')
  return <ProfileSettings name={ctx.user.name} email={ctx.user.email} emailVerified={ctx.user.emailVerified} workspaceName={ctx.workspace.name} canRename={can(ctx.workspace.role, 'manageMembers')} />
}
