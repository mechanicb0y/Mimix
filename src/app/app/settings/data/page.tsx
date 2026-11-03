import type { Metadata } from 'next'
import { DataSettings } from '@/components/app/settings/DataSettings'
import { getAppContext } from '@/server/app-context'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.settings.nav.data }

export default async function DataPage() {
  const ctx = await getAppContext('/app/settings/data')
  return <DataSettings email={ctx.user.email} />
}
