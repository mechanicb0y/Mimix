import type { Metadata } from 'next'
import { MyVoices } from '@/components/app/voices/MyVoices'
import { getAppContext } from '@/server/app-context'
import { effectivePlan } from '@/config/plans'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.myVoices.seoTitle }

export default async function MyVoicesPage() {
  const ctx = await getAppContext('/app/voices')
  return <MyVoices limit={effectivePlan(ctx.workspace).customVoices} />
}
