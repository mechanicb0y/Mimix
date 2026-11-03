import { z } from '@/lib/zod'
import { listGenerations } from '@/server/generations'
import { route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

const q = z.object({ before: z.coerce.date().optional(), limit: z.coerce.number().int().min(1).max(100).default(20) })

/** GET /api/v1/transcripts — newest first, without segments. */
export const GET = route({ permission: 'viewContent', scope: 'stt' }, async (req, auth) => {
  const p = q.parse(Object.fromEntries(new URL(req.url).searchParams))
  const rows = await listGenerations(auth.workspaceId, { module: 'stt', ...p })
  return Response.json({
    items: rows.map((g) => ({ id: g.id, status: g.status, title: (g.input.title as string) ?? (g.input.filename as string) ?? '', durationMs: g.durationMs, credits: g.credits, language: g.input.language ?? null, segments: Array.isArray(g.input.segments) ? g.input.segments.length : 0, createdAt: g.createdAt })),
    nextBefore: rows.length === p.limit ? rows.at(-1)!.createdAt : null,
  })
})
