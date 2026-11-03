import { body } from '@/server/api/route'
import { adminRoute } from '@/server/admin/guard'
import { apiError } from '@/server/api/errors'
import { FLAG_KEYS, type FlagKey } from '@/config/flags'
import { editFlag, flagEditSchema } from '@/server/admin/platform'
import { getMessages } from '@/i18n'

export const dynamic = 'force-dynamic'

/** PUT /api/admin/flags/{key} — switch a tool on or off, by plan or for named users. */
export const PUT = adminRoute<{ key: string }>({ permission: 'manageFlags' }, async (req, actor, { key }) => {
  if (!(FLAG_KEYS as string[]).includes(key)) return apiError(404, 'not_found', getMessages('en').errors.app.notFound)
  await editFlag(actor, key as FlagKey, await body(req, flagEditSchema))
  return new Response(null, { status: 204 })
})
