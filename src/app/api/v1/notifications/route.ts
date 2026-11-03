import { and, count, desc, eq, isNull } from 'drizzle-orm'
import { route } from '@/server/api/route'
import { getDb, schema } from '@/server/db'
import { apiError } from '@/server/api/errors'

export const dynamic = 'force-dynamic'

/** GET the latest 30 notifications for the signed-in user; POST marks them all read. */
export const GET = route({ permission: 'viewContent' }, async (_req, auth) => {
  if (!auth.userId || auth.via !== 'session') return apiError(403, 'forbidden', 'Notifications are only available in the app.')
  const db = getDb()
  const [items, [unread]] = await Promise.all([
    db.select().from(schema.notification).where(eq(schema.notification.userId, auth.userId)).orderBy(desc(schema.notification.createdAt)).limit(30),
    db.select({ n: count() }).from(schema.notification).where(and(eq(schema.notification.userId, auth.userId), isNull(schema.notification.readAt))),
  ])
  return Response.json({ items, unread: unread?.n ?? 0 })
})

export const POST = route({ permission: 'viewContent' }, async (_req, auth) => {
  if (!auth.userId || auth.via !== 'session') return apiError(403, 'forbidden', 'Notifications are only available in the app.')
  await getDb().update(schema.notification).set({ readAt: new Date() }).where(and(eq(schema.notification.userId, auth.userId), isNull(schema.notification.readAt)))
  return new Response(null, { status: 204 })
})
