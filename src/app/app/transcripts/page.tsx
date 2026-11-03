import type { Metadata } from 'next'
import { TranscriptsHome } from '@/components/app/transcripts/TranscriptsHome'
import { getAppContext } from '@/server/app-context'
import { ENGINE_LIMITS } from '@/config/engine-limits'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.stt.seoTitle }

export default async function TranscriptsPage() {
  const ctx = await getAppContext('/app/transcripts')
  return <TranscriptsHome maxMs={ENGINE_LIMITS.sttMaxHours.value * 3_600_000} canGenerate={ctx.workspace.role !== 'viewer'} />
}
