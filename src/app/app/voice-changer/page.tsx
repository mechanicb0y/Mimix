import type { Metadata } from 'next'
import { ChangerStudio } from '@/components/app/changer/ChangerStudio'
import { getAppContext } from '@/server/app-context'
import { ENGINE_LIMITS } from '@/config/engine-limits'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.changer.seoTitle }

export default async function ChangerPage() {
  const ctx = await getAppContext('/app/voice-changer')
  return <ChangerStudio maxMs={ENGINE_LIMITS.changerMaxMinutes.value * 60_000} canGenerate={ctx.workspace.role !== 'viewer'} />
}
