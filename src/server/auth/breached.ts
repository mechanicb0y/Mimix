import 'server-only'
import { createHash } from 'node:crypto'
import { env } from '@/server/env'

/**
 * Breached-password check.
 * - "online": Have I Been Pwned range API with k-anonymity. Only the first 5 hex characters of the
 *   SHA-1 hash leave the server; the match happens locally. If the API is unreachable we fall back
 *   to the local list rather than block sign-up.
 * - "local": a bundled list of very common passwords that are 10 characters or longer (shorter ones
 *   are already rejected by the length rule). Used offline and in tests.
 */
const COMMON = new Set([
  '1234567890', '0123456789', '0987654321', '1111111111', '0000000000', '1234512345', '1122334455', '1212121212',
  'qwertyuiop', 'asdfghjkl;', 'zxcvbnm123', 'qwerty1234', 'qwerty12345', 'qwerty123456', '1q2w3e4r5t', '1qaz2wsx3edc',
  'q1w2e3r4t5', 'zaq12wsxcde3', 'password12', 'password123', 'password1234', 'password!1', 'passw0rd123', 'p@ssw0rd123',
  'iloveyou12', 'iloveyou123', 'welcome123', 'welcome1234', 'letmein123', 'football123', 'baseball123', 'princess123',
  'sunshine123', 'superman123', 'starwars123', 'dragon1234', 'monkey1234', 'master1234', 'michael123', 'jennifer12',
  'charlie123', 'trustno1234', 'abcdefghij', 'abcd123456', 'abc1234567', 'a123456789', '123456789a', '12345678910',
  '123123123123', '123qweasdzxc', 'qweasdzxc123', 'adminadmin', 'administrator', 'admin12345', 'changeme123', 'loveyou1234',
  'computer123', 'internet123', 'whatever123', 'freedom1234', 'mustang1234', 'shadow1234', 'liverpool1', 'chelsea123',
  'arsenal123', 'manchester', 'basketball', 'skateboard', 'blink182182', 'pokemon1234', 'minecraft1', 'minecraft123',
  'fortnite123', 'iloveyou1!', 'mimix12345', 'mimixmimix', 'voicevoice', 'elevenlabs', 'qwertyuiop1', 'Password1!',
])

export async function isBreachedPassword(password: string): Promise<boolean> {
  if (COMMON.has(password) || COMMON.has(password.toLowerCase())) return true
  if (env().BREACHED_PASSWORD_CHECK !== 'online') return false
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { 'Add-Padding': 'true' }, signal: AbortSignal.timeout(3000) })
    if (!res.ok) return false
    const body = await res.text()
    return body.split('\n').some((line) => { const [s, count] = line.trim().split(':'); return s === suffix && Number(count) > 0 })
  } catch {
    return false
  }
}
