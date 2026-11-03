import type { Metadata } from 'next'
import { VoiceDetail } from '@/components/app/voices/VoiceDetail'
import { getAppContext } from '@/server/app-context'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.myVoices.seoTitle }

export default async function VoicePage({ params }: PageProps<'/app/voices/[id]'>) {
  const { id } = await params
  const ctx = await getAppContext(`/app/voices/${id}`)
  return <VoiceDetail id={id} canManage={ctx.workspace.role !== 'viewer'} />
}
