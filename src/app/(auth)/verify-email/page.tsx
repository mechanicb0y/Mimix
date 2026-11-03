import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, XCircle } from 'lucide-react'
import { getMessages } from '@/i18n'
import { safeNext } from '@/server/auth/providers'

export const metadata: Metadata = { title: getMessages().app.auth.verify.seoTitle, robots: { index: false } }

/** Landing page after the verification link: Better Auth adds ?error= when the token is bad. */
export default async function VerifyEmailPage({ searchParams }: PageProps<'/verify-email'>) {
  const sp = await searchParams
  const t = getMessages().app.auth.verify
  const failed = typeof sp.error === 'string'
  return (
    <div role="status">
      <span className="icon-tile mb-4">{failed ? <XCircle aria-hidden="true" size={20} /> : <CheckCircle2 aria-hidden="true" size={20} />}</span>
      <h1 className="text-[28px] leading-9 font-bold">{failed ? t.failTitle : t.okTitle}</h1>
      <p className="mt-3 text-[var(--text-muted)]">{failed ? t.failBody : t.okBody}</p>
      <Link href={failed ? '/sign-in' : safeNext(sp.next)} className="m-btn primary mt-6">{failed ? t.signIn : t.continue}</Link>
    </div>
  )
}
