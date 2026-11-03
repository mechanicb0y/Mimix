import type { Metadata } from 'next'
import { ResetForm } from '@/components/auth/ResetForm'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.auth.reset.seoTitle, robots: { index: false } }

/** Better Auth redirects here with ?token=… (valid) or ?error=INVALID_TOKEN (expired or used). */
export default async function ResetPasswordPage({ searchParams }: PageProps<'/reset-password'>) {
  const sp = await searchParams
  const token = typeof sp.token === 'string' ? sp.token : null
  return <ResetForm token={token} invalid={typeof sp.error === 'string'} />
}
