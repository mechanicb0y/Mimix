import { getJob, publicJob } from '@/server/jobs'
import { apiAuth } from '@/server/api/auth'

export const dynamic = 'force-dynamic'

/**
 * Server-Sent Events for one job: an event whenever progress or status changes, then the final
 * state, then the stream closes. It reads the job row, so it works on any server instance.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await apiAuth(req, 'viewContent')
  if (!auth.ok) return auth.response
  const { id } = await ctx.params
  const first = await getJob(id, auth.workspaceId)
  if (!first) return Response.json({ error: { code: 'not_found', message: 'Job not found' } }, { status: 404 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let last = ''
      let closed = false
      req.signal.addEventListener('abort', () => { closed = true })
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      const started = Date.now()
      while (!closed) {
        const j = await getJob(id, auth.workspaceId)
        if (!j) break
        const body = publicJob(j)
        const key = `${body.status}:${body.progress}:${body.message}`
        if (key !== last) { send('progress', body); last = key }
        if (['succeeded', 'failed', 'canceled'].includes(j.status)) { send('done', body); break }
        // Keep proxies from closing an idle stream; stop after 15 minutes (the client reconnects).
        if (Date.now() - started > 15 * 60_000) break
        send('ping', {})
        await new Promise((r) => setTimeout(r, 700))
      }
      try { controller.close() } catch { /* already closed */ }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } })
}
