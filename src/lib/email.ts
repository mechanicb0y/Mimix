/** Email check shared by forms; kept free of zod so the site-wide footer form stays small. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Same rule as `emailField` in lib/validation.ts: 'required', 'invalid' or null when fine. */
export function emailProblem(value: string): 'required' | 'invalid' | null {
  const v = value.trim()
  if (!v) return 'required'
  return v.length <= 254 && EMAIL_RE.test(v) ? null : 'invalid'
}
