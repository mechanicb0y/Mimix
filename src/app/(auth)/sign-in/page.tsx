import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SignInForm } from '@/components/auth/SignInForm'
import { googleEnabled, safeNext } from '@/server/auth/providers'
import { getSession } from '@/server/session'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.auth.signIn.seoTitle, robots: { index: false } }

export default async function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
  const next = safeNext((await searchParams).next)
  if (await getSession()) redirect(next)
  return <SignInForm next={next} google={googleEnabled()} />
}
