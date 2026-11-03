import { z } from '@/lib/zod'
import { cookies } from 'next/headers'
import { getSession } from '@/server/session'
import { getMembership } from '@/server/workspaces'
import { apiError } from '@/server/api/errors'

const schema = z.object({ workspaceId: z.string().min(1).max(64) })

/** Switches the active workspace (cookie) after checking membership. */
export async function POST(req: Request) {
  const s = await getSession()
  if (!s) return apiError(401, 'unauthenticated', 'Sign in to continue.')
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success || !(await getMembership(parsed.data.workspaceId, s.user.id))) return apiError(403, 'forbidden', 'Not a member of that workspace.')
  ;(await cookies()).set('mimix_ws', parsed.data.workspaceId, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 })
  return new Response(null, { status: 204 })
}
