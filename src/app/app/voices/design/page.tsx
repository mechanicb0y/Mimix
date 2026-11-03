import type { Metadata } from 'next'
import { DesignStudio } from '@/components/app/design/DesignStudio'
import { getAppContext } from '@/server/app-context'
import { getMessages } from '@/i18n'
import { kokoroIsMain } from '@/server/engine'
import { KOKORO_DESIGN_LANGUAGES } from '@/lib/voice/kokoro-design'

export const metadata: Metadata = { title: getMessages().app.designUi.seoTitle }

export default async function DesignPage() {
  const ctx = await getAppContext('/app/voices/design')
  // On Kokoro, designs are Mixer recipes in Kokoro's languages, with the accents it has.
  return <DesignStudio canGenerate={ctx.workspace.role !== 'viewer'} accents={kokoroIsMain() ? KOKORO_DESIGN_LANGUAGES : null} />
}
