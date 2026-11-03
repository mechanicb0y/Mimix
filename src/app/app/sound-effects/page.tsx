import type { Metadata } from 'next'
import { SoundEffectsStudio } from '@/components/app/tools/SoundEffectsStudio'
import { getAppContext } from '@/server/app-context'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.sfx.seoTitle }

export default async function SoundEffectsPage() {
  const ctx = await getAppContext('/app/sound-effects')
  return <SoundEffectsStudio canGenerate={ctx.workspace.role !== 'viewer'} />
}
