import { eq } from 'drizzle-orm'
import { getAuth } from '@/server/auth'
import { getDb, schema } from '@/server/db'
import { readOutbox } from '@/server/email'

let n = 0
/**
 * A verified, signed-in user with their own workspace. Returns the session cookie for `call(…, { headers: { cookie } })`.
 * Test files that use it must mock `next/headers` (cookies() needs a request scope).
 */
export async function signedIn(opts: { plan?: 'free' | 'maker' | 'pro' | 'production' | 'team'; credits?: number; name?: string } = {}) {
  const email = `dev${Date.now()}${n++}@example.test`
  const password = 'correct horse battery staple'
  const res = await getAuth().api.signUpEmail({ body: { email, password, name: opts.name ?? 'Dev Tester' } })
  const mail = (await readOutbox({ to: email, tag: 'verify' }))[0]!
  const url = new URL(mail.text.match(/https?:\/\/\S+/)![0])
  await getAuth().api.verifyEmail({ query: { token: url.searchParams.get('token') ?? url.pathname.split('/').pop()! } })
  const login = await getAuth().api.signInEmail({ body: { email, password }, asResponse: true })
  const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get('set-cookie') ?? '']).map((c) => c.split(';')[0]).join('; ')
  const [u] = await getDb().select().from(schema.user).where(eq(schema.user.id, res.user.id))
  const workspaceId = u!.defaultWorkspaceId!
  if (opts.plan || opts.credits !== undefined) await getDb().update(schema.workspace).set({ ...(opts.plan ? { planId: opts.plan } : {}), ...(opts.credits !== undefined ? { creditBalance: opts.credits } : {}) }).where(eq(schema.workspace.id, workspaceId))
  return { cookie, userId: u!.id, workspaceId, email }
}
