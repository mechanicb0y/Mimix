import type { Metadata } from 'next'
import { MixerStudio } from '@/components/app/mixer/MixerStudio'
import { getAppContext } from '@/server/app-context'
import { getMessages } from '@/i18n'
import { mixerNeedsRecipes } from '@/server/engine'

export const metadata: Metadata = { title: getMessages().app.mixer.seoTitle }

export default async function MixerPage() {
  const ctx = await getAppContext('/app/voices/mixer')
  return <MixerStudio canGenerate={ctx.workspace.role !== 'viewer'} libraryOnly={mixerNeedsRecipes()} />
}
