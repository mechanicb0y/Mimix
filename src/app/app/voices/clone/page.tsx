import type { Metadata } from 'next'
import { CloneWizard } from '@/components/app/clone/CloneWizard'
import { getAppContext } from '@/server/app-context'
import { getVoiceRow } from '@/server/modules/voices'
import { effectivePlan, planHas } from '@/config/plans'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.clone.seoTitle }

export default async function ClonePage({ searchParams }: PageProps<'/app/voices/clone'>) {
  const ctx = await getAppContext('/app/voices/clone')
  const sp = await searchParams
  const plan = effectivePlan(ctx.workspace)
  let resume = null
  let resumeError = false
  if (typeof sp.voice === 'string') {
    const v = await getVoiceRow(sp.voice)
    if (v && v.workspaceId === ctx.workspace.id && v.status === 'pending_consent') resume = { id: v.id, name: v.name, kind: v.kind }
    else resumeError = true
  }
  return (
    <CloneWizard
      canInstant={planHas(plan, 'instantClone')}
      canPro={plan.professionalClones > 0 || plan.id === 'enterprise'}
      canWrite={ctx.workspace.role !== 'viewer'}
      resume={resume}
      resumeError={resumeError}
    />
  )
}
