import { transcriptPatchSchema } from '@/lib/schemas/audio-tools'
import { getTranscript, transcriptView, updateTranscript } from '@/server/modules/audio-tools'
import { deleteGeneration } from '@/server/generations'
import { body, route } from '@/server/api/route'
import { toSrt, toTxt, toVtt, TRANSCRIPT_MIME, type Segment } from '@/lib/transcript-format'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/transcripts/{id} — JSON with segments, or ?format=txt|srt|vtt to download.
 * &timestamps=1 adds times to TXT; &speakers=0 leaves speaker names out.
 */
export const GET = route<{ id: string }>({ permission: 'viewContent', scope: 'stt' }, async (req, auth, { id }) => {
  const t = await transcriptView(await getTranscript(auth.workspaceId, id))
  const sp = new URL(req.url).searchParams
  const format = sp.get('format')
  if (!format || format === 'json') return Response.json(t)
  if (format !== 'txt' && format !== 'srt' && format !== 'vtt') return Response.json({ error: { code: 'format', message: 'Use txt, srt, vtt or json.' } }, { status: 422 })
  const opts = { names: t.speakerNames, speakers: sp.get('speakers') !== '0', timestamps: sp.get('timestamps') === '1' }
  const segs = t.segments as Segment[]
  const text = format === 'txt' ? toTxt(segs, opts) : format === 'srt' ? toSrt(segs, opts) : toVtt(segs, opts)
  const file = `${(t.title || 'transcript').replace(/[^\w.-]+/g, '-').slice(0, 80)}.${format}`
  return new Response(text, { headers: { 'Content-Type': TRANSCRIPT_MIME[format], 'Content-Disposition': `attachment; filename="${file}"`, 'Cache-Control': 'no-store' } })
})

/** PATCH /api/v1/transcripts/{id} — rename the transcript or its speakers. */
export const PATCH = route<{ id: string }>({ permission: 'generate', scope: 'stt' }, async (req, auth, { id }) =>
  Response.json(await transcriptView(await updateTranscript(auth.workspaceId, id, await body(req, transcriptPatchSchema)))))

export const DELETE = route<{ id: string }>({ permission: 'generate', scope: 'stt' }, async (_req, auth, { id }) => {
  await getTranscript(auth.workspaceId, id)
  await deleteGeneration(id, auth.workspaceId)
  return new Response(null, { status: 204 })
})
