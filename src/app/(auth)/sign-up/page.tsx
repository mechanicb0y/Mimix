import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { googleEnabled, safeNext } from '@/server/auth/providers'
import { getSession } from '@/server/session'
import { getMessages } from '@/i18n'

// Indexed (people search for "Mimix sign up"); the other auth pages stay out of search.
export const metadata: Metadata = { title: getMessages().app.auth.signUp.seoTitle, description: getMessages().app.auth.signUp.subtitle, alternates: { canonical: '/sign-up' } }

export default async function SignUpPage({ searchParams }: PageProps<'/sign-up'>) {
  const next = safeNext((await searchParams).next)
  if (await getSession()) redirect(next)
  return <SignUpForm google={googleEnabled()} next={next} />
}
