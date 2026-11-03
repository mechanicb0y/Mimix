import { eq } from 'drizzle-orm'
import { z } from '@/lib/zod'
import { getDb, schema } from '@/server/db'
import { env } from '@/server/env'

export const dynamic = 'force-dynamic'

/**
 * End-to-end tests only (ENABLE_TEST_ROUTES=1, never set in production): the workspace an account
 * owns, so a test can play Stripe's part and send the signed webhook that follows Checkout.
 */
export async function POST(req: Request) {
  if (!env().ENABLE_TEST_ROUTES) return new Response('Not found', { status: 404 })
  const input = z.object({ email: z.string().email() }).parse(await req.json())
  const db = getDb()
  const [row] = await db.select({ workspaceId: schema.workspace.id, customer: schema.workspace.stripeCustomerId, plan: schema.workspace.planId })
    .from(schema.user)
    .innerJoin(schema.workspaceMember, eq(schema.workspaceMember.userId, schema.user.id))
    .innerJoin(schema.workspace, eq(schema.workspace.id, schema.workspaceMember.workspaceId))
    .where(eq(schema.user.email, input.email.toLowerCase()))
  if (!row) return new Response('Not found', { status: 404 })
  return Response.json(row)
}
