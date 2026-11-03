import type { Metadata } from 'next'
import { getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: { default: getMessages().admin.seoTitle, template: '%s · Mimix admin' },
  robots: { index: false, follow: false, nocache: true },
}

export default function AdminRoot({ children }: LayoutProps<'/admin'>) {
  return children
}
