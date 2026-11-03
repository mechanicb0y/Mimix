import { adminRoute } from '@/server/admin/guard'
import { sendTestEmail } from '@/server/admin/platform'

export const dynamic = 'force-dynamic'

/** POST /api/admin/emails/{key}/test — sends the template, with sample values, to the signed-in admin. */
export const POST = adminRoute<{ key: string }>({ permission: 'viewSystem' }, async (_req, actor, { key }) => {
  await sendTestEmail(actor, key)
  return new Response(null, { status: 204 })
})
