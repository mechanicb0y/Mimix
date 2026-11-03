import { adminRoute } from '@/server/admin/guard'
import { auditCsv } from '@/server/admin/platform'

export const dynamic = 'force-dynamic'

/** GET /api/admin/audit/export?actor=&action=&target=&from=&to= — the audit log as CSV. */
export const GET = adminRoute({ permission: 'viewAudit' }, async (req, actor) => {
  const q = Object.fromEntries(new URL(req.url).searchParams)
  const csv = await auditCsv(actor, q)
  const name = `mimix-audit-${new Date().toISOString().slice(0, 10)}.csv`
  return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'no-store' } })
})
