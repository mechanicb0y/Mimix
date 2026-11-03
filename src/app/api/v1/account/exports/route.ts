import { listExports, requestExport } from '@/server/modules/account'
import { route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** GET /api/v1/account/exports — the person's recent data exports. */
export const GET = route({ permission: 'viewContent', sessionOnly: true }, async (_req, auth) => Response.json({ items: await listExports(auth.userId!) }))

/** POST /api/v1/account/exports — starts a data export (202 with a job id). One per 24 hours. */
export const POST = route({ permission: 'viewContent', sessionOnly: true }, async (_req, auth) =>
  Response.json(await requestExport(auth.userId!, auth.workspaceId), { status: 202 }))
