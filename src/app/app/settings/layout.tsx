import type { Metadata } from 'next'
import { SettingsNav } from '@/components/app/settings/SettingsNav'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: { default: getMessages().app.settings.seoTitle, template: '%s · Settings · Mimix' } }

export default function SettingsLayout({ children }: LayoutProps<'/app/settings'>) {
  const t = getMessages().app.settings
  return (
    <div className="mx-auto grid max-w-[1100px] gap-6">
      <h1 className="app-page-title">{t.title}</h1>
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <SettingsNav />
        <div className="grid min-w-0 content-start gap-6">{children}</div>
      </div>
    </div>
  )
}
