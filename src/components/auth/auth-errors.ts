import { getMessages, fmt } from '@/i18n'

/** Maps Better Auth error codes to our copy. */
export function authErrorMessage(err: { code?: string; status?: number; message?: string } | null | undefined): string {
  const t = getMessages('en').errors.auth
  if (!err) return t.generic
  switch (err.code) {
    case 'INVALID_EMAIL_OR_PASSWORD': case 'INVALID_PASSWORD': case 'INVALID_EMAIL': return t.invalidCredentials
    case 'EMAIL_NOT_VERIFIED': return t.emailNotVerified
    case 'USER_ALREADY_EXISTS': case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL': return t.emailTaken
    case 'PASSWORD_TOO_SHORT': return fmt(t.tooShort, { min: 10 })
    case 'PASSWORD_TOO_LONG': return fmt(t.tooLong, { max: 128 })
    case 'PASSWORD_BREACHED': return t.breachedPassword
    case 'ACCOUNT_LOCKED': case 'ACCOUNT_SUSPENDED': return err.message ?? t.generic
    case 'INVALID_TOKEN': return t.tokenExpired
    case 'INVALID_CODE': case 'INVALID_TWO_FACTOR_CODE': case 'INVALID_BACKUP_CODE': return t.invalidCode
  }
  if (err.status === 429) return err.message && err.message !== 'Too many requests. Please try again later.' ? err.message : t.rateLimited
  if (err.status === 403 && err.message) return err.message
  return t.generic
}
