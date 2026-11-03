import type { Metadata } from 'next'
import { LibraryBrowser } from '@/components/app/voices/LibraryBrowser'
import { getAppContext } from '@/server/app-context'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.libraryApp.seoTitle }

export default async function LibraryPage() {
  const ctx = await getAppContext('/app/voices/library')
  return <LibraryBrowser canSave={ctx.workspace.role !== 'viewer'} />
}
