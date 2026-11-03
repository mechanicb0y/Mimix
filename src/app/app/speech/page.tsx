import type { Metadata } from 'next'
import { SpeechStudio } from '@/components/app/speech/SpeechStudio'
import { getAppContext } from '@/server/app-context'
import { getVoiceEngine } from '@/server/engine'
import { listRules } from '@/server/modules/tts'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.speech.seoTitle }

export default async function SpeechPage({ searchParams }: PageProps<'/app/speech'>) {
  const ctx = await getAppContext('/app/speech')
  const sp = await searchParams
  const engine = getVoiceEngine()
  const rules = await listRules(ctx.workspace.id)
  return (
    <SpeechStudio
      models={engine.capabilities.models.map((m) => ({ id: m.id, name: m.name, default: !!m.default }))}
      ruleCount={rules.length}
      initialVoiceId={typeof sp.voice === 'string' ? sp.voice : 'lib_wren'}
      canGenerate={ctx.workspace.role !== 'viewer'}
    />
  )
}
