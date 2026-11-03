import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { symmetricEncrypt } from 'better-auth/crypto'
import { z } from '@/lib/zod'
import { getAuth } from '@/server/auth'
import { getDb, schema } from '@/server/db'
import { env } from '@/server/env'
import { newId } from '@/server/ids'
import { STAFF_ROLES } from '@/config/admin'

export const dynamic = 'force-dynamic'

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * End-to-end tests only (ENABLE_TEST_ROUTES=1, never set in production): makes an existing account
 * staff with two-factor on, and returns the TOTP secret so the test can answer the re-auth step.
 */
export async function POST(req: Request) {
  if (!env().ENABLE_TEST_ROUTES) return new Response('Not found', { status: 404 })
  const input = z.object({ email: z.string().email(), role: z.enum(STAFF_ROLES) }).parse(await req.json())
  const db = getDb()
  const [u] = await db.select().from(schema.user).where(eq(schema.user.email, input.email.toLowerCase()))
  if (!u) return new Response('Not found', { status: 404 })
  const secret = Array.from(randomBytes(20), (b) => BASE32[b % 32]).join('')
  const ctx = await getAuth().$context
  await db.delete(schema.twoFactor).where(eq(schema.twoFactor.userId, u.id))
  await db.insert(schema.twoFactor).values({ id: newId('tf'), userId: u.id, secret: await symmetricEncrypt({ key: ctx.secretConfig, data: secret }), backupCodes: '[]' })
  await db.update(schema.user).set({ role: input.role, twoFactorEnabled: true }).where(eq(schema.user.id, u.id))
  return Response.json({ userId: u.id, secret })
}
