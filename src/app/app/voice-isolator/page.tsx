import type { Metadata } from 'next'
import { IsolatorStudio } from '@/components/app/tools/IsolatorStudio'
import { getAppContext } from '@/server/app-context'
import { ENGINE_LIMITS } from '@/config/engine-limits'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.isolator.seoTitle }

export default async function IsolatorPage() {
  const ctx = await getAppContext('/app/voice-isolator')
  return <IsolatorStudio maxMs={ENGINE_LIMITS.isolatorMaxHours.value * 3_600_000} canGenerate={ctx.workspace.role !== 'viewer'} />
}
