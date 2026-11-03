import type { Metadata } from 'next'
import { DubProject } from '@/components/app/dubbing/DubProject'
import { getAppContext } from '@/server/app-context'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.dubbing.seoTitle }

export default async function DubProjectPage({ params }: PageProps<'/app/dubbing/[id]'>) {
  const { id } = await params
  const ctx = await getAppContext(`/app/dubbing/${id}`)
  return <DubProject id={id} canEdit={ctx.workspace.role !== 'viewer'} />
}
