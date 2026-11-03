import { z } from '@/lib/zod'
import { MODULES } from '@/server/db/schema'
import { route } from '@/server/api/route'
import { generationView, listGenerations } from '@/server/generations'

export const dynamic = 'force-dynamic'

const q = z.object({ module: z.enum(MODULES).optional(), before: z.coerce.date().optional(), limit: z.coerce.number().int().min(1).max(100).default(20) })

/** GET /api/v1/history — newest first; page with ?before=<createdAt of the last item>. */
export const GET = route({ permission: 'viewContent', scope: 'any' }, async (req, auth) => {
  const p = q.parse(Object.fromEntries(new URL(req.url).searchParams))
  const rows = await listGenerations(auth.workspaceId, p)
  const items = await Promise.all(rows.map(generationView))
  return Response.json({ items, nextBefore: rows.length === p.limit ? rows.at(-1)!.createdAt : null })
})
