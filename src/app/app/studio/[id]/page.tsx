import type { Metadata } from 'next'
import { StudioEditor } from '@/components/app/studio/StudioEditor'
import { getAppContext } from '@/server/app-context'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.studio.seoTitle }

export default async function StudioProjectPage({ params }: PageProps<'/app/studio/[id]'>) {
  const { id } = await params
  const ctx = await getAppContext(`/app/studio/${id}`)
  return <StudioEditor id={id} canEdit={ctx.workspace.role !== 'viewer'} />
}
