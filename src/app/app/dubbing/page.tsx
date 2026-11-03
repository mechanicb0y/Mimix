import type { Metadata } from 'next'
import { DubbingHome } from '@/components/app/dubbing/DubbingHome'
import { getAppContext } from '@/server/app-context'
import { ENGINE_LIMITS } from '@/config/engine-limits'
import { effectivePlan, planHas } from '@/config/plans'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.dubbing.seoTitle }

export default async function DubbingPage() {
  const ctx = await getAppContext('/app/dubbing')
  return <DubbingHome maxMs={ENGINE_LIMITS.dubbingMaxMinutes.value * 60_000} canGenerate={ctx.workspace.role !== 'viewer'} canDub={planHas(effectivePlan(ctx.workspace), 'dubbing')} />
}
