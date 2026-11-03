import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'

/** The signed-in person's name and email (account routes are session-only, so userId is set). */
export async function userOf(userId: string | null) {
  const [u] = await getDb().select({ id: schema.user.id, name: schema.user.name, email: schema.user.email }).from(schema.user).where(eq(schema.user.id, userId ?? ''))
  if (!u) throw new Error('Signed-in user not found')
  return u
}
