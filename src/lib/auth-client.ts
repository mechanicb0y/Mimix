'use client'
import { createAuthClient } from 'better-auth/react'
import { twoFactorClient } from 'better-auth/client/plugins'

/** Browser auth client. Same origin, so no base URL is needed. */
export const authClient = createAuthClient({
  plugins: [twoFactorClient({ onTwoFactorRedirect: () => { window.location.href = '/two-factor' } })],
})
