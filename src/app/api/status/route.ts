import { publicStatus } from '@/server/settings'

export const dynamic = 'force-dynamic'

/** GET /api/status — the site banner and maintenance notice, for static marketing pages. */
export async function GET() {
  try {
    return Response.json(await publicStatus(), { headers: { 'cache-control': 'public, max-age=30, s-maxage=30' } })
  } catch {
    return Response.json({ announcement: null, maintenance: null })
  }
}
