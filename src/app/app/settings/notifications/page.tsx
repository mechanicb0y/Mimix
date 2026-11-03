import type { Metadata } from 'next'
import { NotificationSettings } from '@/components/app/settings/NotificationSettings'
import { getAppContext } from '@/server/app-context'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.settings.nav.notifications }

export default async function NotificationsPage() {
  await getAppContext('/app/settings/notifications')
  return <NotificationSettings />
}
