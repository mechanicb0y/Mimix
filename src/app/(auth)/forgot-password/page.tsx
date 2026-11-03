import type { Metadata } from 'next'
import { ForgotForm } from '@/components/auth/ForgotForm'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.auth.forgot.seoTitle, robots: { index: false } }

export default function ForgotPasswordPage() {
  return <ForgotForm />
}
