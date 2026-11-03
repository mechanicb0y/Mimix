import type { Metadata } from 'next'
import { TranscriptViewer } from '@/components/app/transcripts/TranscriptViewer'
import { getAppContext } from '@/server/app-context'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.stt.seoTitle }

export default async function TranscriptPage({ params }: PageProps<'/app/transcripts/[id]'>) {
  const { id } = await params
  const ctx = await getAppContext(`/app/transcripts/${id}`)
  return <TranscriptViewer id={id} canEdit={ctx.workspace.role !== 'viewer'} />
}
