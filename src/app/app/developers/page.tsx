import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DevelopersHome } from '@/components/app/developers/DevelopersHome'
import { apiBase, codeSamples, jobSample, webhookSample } from '@/components/marketing/code-samples'
import { getAppContext } from '@/server/app-context'
import { can } from '@/server/workspaces'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.developers.seoTitle }

export default async function DevelopersPage() {
  const ctx = await getAppContext('/app/developers')
  const samples = { tts: codeSamples(), jobs: jobSample(), verify: webhookSample(), base: apiBase() }
  return (
    <Suspense>
      <DevelopersHome canManage={can(ctx.workspace.role, 'manageApiKeys')} samples={samples} />
    </Suspense>
  )
}
