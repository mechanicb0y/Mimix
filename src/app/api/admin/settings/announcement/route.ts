import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { announcementSchema, saveAnnouncement } from '@/server/admin/platform'

export const dynamic = 'force-dynamic'

export const PUT = adminRoute({ permission: 'manageFlags' }, async (req, actor) => {
  await saveAnnouncement(actor, await body(req, announcementSchema))
  return new Response(null, { status: 204 })
})
