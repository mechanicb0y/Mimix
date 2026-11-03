import type { Metadata } from 'next'
import { StudioHome } from '@/components/app/studio/StudioHome'
import { getAppContext } from '@/server/app-context'
import { effectivePlan, planHas } from '@/config/plans'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.studio.seoTitle }

export default async function StudioPage() {
  const ctx = await getAppContext('/app/studio')
  return <StudioHome canGenerate={ctx.workspace.role !== 'viewer'} canStudio={planHas(effectivePlan(ctx.workspace), 'studio')} />
}
