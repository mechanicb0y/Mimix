/** Site-wide constants. The public URL comes from the environment because there is no domain yet. */
export const SITE_NAME = 'Mimix'

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return raw.replace(/\/+$/, '')
}

export function absoluteUrl(path = '/'): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`
}

/** Where marketing calls to action send people. */
export const APP_ROUTES = {
  signup: '/sign-up',
  login: '/sign-in',
} as const

/** Set NEXT_PUBLIC_SUPPORT_EMAIL once the domain exists; example.com is a reserved placeholder domain. */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com'
export const DEFAULT_LOCALE = 'en'
