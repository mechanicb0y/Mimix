import type { ReactNode } from 'react'
import { Logo } from '@/components/site/Logo'

/** The frame for the lock screen, the 2FA requirement and Owner setup. */
export function CenteredCard({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="m-card grid w-full max-w-[440px] gap-5 p-6 sm:p-8">
        <Logo id="mark-admin-card" href="/" />
        <div>
          <h1 className="text-[24px] font-semibold leading-8">{title}</h1>
          {body ? <p className="mt-2 text-[var(--text-muted)]">{body}</p> : null}
        </div>
        {children}
      </div>
    </main>
  )
}
