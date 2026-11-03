import type { Metadata } from 'next'
import { TwoFactorForm } from '@/components/auth/TwoFactorForm'
import { safeNext } from '@/server/auth/providers'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.auth.twoFactor.seoTitle, robots: { index: false } }

export default async function TwoFactorPage({ searchParams }: PageProps<'/two-factor'>) {
  return <TwoFactorForm next={safeNext((await searchParams).next)} />
}
