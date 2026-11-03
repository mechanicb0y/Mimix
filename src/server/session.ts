import 'server-only'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { getAuth } from '@/server/auth'
import { anyMembership, getMembership, can, ForbiddenError, type Permission } from '@/server/workspaces'

/** The signed-in user and session for this request, or null. Cached per request. */
export const getSession = cache(async () => {
  const s = await getAuth().api.getSession({ headers: await headers() })
  return s
})

/** For pages: redirects to sign-in when there is no session. */
export async function requireUser(next = '/app') {
  const s = await getSession()
  if (!s) redirect(`/sign-in?next=${encodeURIComponent(next)}`)
  return s
}

/** The workspace the user is acting in: the cookie choice if they are a member, else their default. */
export async function requireWorkspace(permission: Permission = 'viewContent', next = '/app') {
  const s = await requireUser(next)
  const { cookies } = await import('next/headers')
  const chosen = (await cookies()).get('mimix_ws')?.value
  const candidates = [chosen, (s.user as { defaultWorkspaceId?: string | null }).defaultWorkspaceId].filter((x): x is string => !!x)
  for (const id of candidates) {
    const m = await getMembership(id, s.user.id)
    if (m) {
      if (!can(m.role, permission)) throw new ForbiddenError()
      return { session: s, user: s.user, workspace: m.workspace, role: m.role }
    }
  }
  // Left or removed from both: fall back to any workspace they still belong to.
  const m = await anyMembership(s.user.id)
  if (m) {
    if (!can(m.role, permission)) throw new ForbiddenError()
    return { session: s, user: s.user, workspace: m.workspace, role: m.role }
  }
  throw new ForbiddenError('No workspace found for this account.')
}
