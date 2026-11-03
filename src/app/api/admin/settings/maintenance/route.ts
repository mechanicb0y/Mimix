import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { maintenanceSchema, saveMaintenance } from '@/server/admin/platform'

export const dynamic = 'force-dynamic'

/** PUT /api/admin/settings/maintenance — closes the app and API to everyone but staff. */
export const PUT = adminRoute({ permission: 'manageFlags', destructive: true }, async (req, actor) => {
  await saveMaintenance(actor, await body(req, maintenanceSchema))
  return new Response(null, { status: 204 })
})
