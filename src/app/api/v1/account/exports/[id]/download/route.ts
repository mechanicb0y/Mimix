import { exportDownloadUrl } from '@/server/modules/account'
import { route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** GET /api/v1/account/exports/{id}/download — redirects to a short-lived signed URL for the ZIP. */
export const GET = route<{ id: string }>({ permission: 'viewContent', sessionOnly: true }, async (_req, auth, { id }) =>
  new Response(null, { status: 302, headers: { Location: await exportDownloadUrl(auth.userId!, id), 'Cache-Control': 'no-store' } }))
