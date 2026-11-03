import { z } from '@/lib/zod'
import { dubCaptions } from '@/server/modules/dubbing'
import { route } from '@/server/api/route'
import { TRANSCRIPT_MIME } from '@/lib/transcript-format'
import { FORM_LANGUAGES } from '@/config/languages'

export const dynamic = 'force-dynamic'

const q = z.object({ language: z.enum(['source', ...FORM_LANGUAGES]), format: z.enum(['srt', 'vtt']).default('srt') })

/** GET /api/v1/dubbing/{id}/captions?language=es&format=srt|vtt — captions for the source or one language. */
export const GET = route<{ id: string }>({ permission: 'viewContent', scope: 'dubbing' }, async (req, auth, { id }) => {
  const p = q.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!p.success) return Response.json({ error: { code: 'validation', message: 'Use language=source or a language code, and format=srt or vtt.' } }, { status: 422 })
  const { text, filename } = await dubCaptions(auth.workspaceId, id, p.data.language, p.data.format)
  return new Response(text, { headers: { 'Content-Type': TRANSCRIPT_MIME[p.data.format], 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' } })
})
