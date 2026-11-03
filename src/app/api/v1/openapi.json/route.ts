import { openApiDocument } from '@/server/openapi'
import { env } from '@/server/env'

export const dynamic = 'force-dynamic'

/** GET /api/v1/openapi.json — the OpenAPI 3.1 document. Public. */
export function GET() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || `${env().APP_URL}/api`
  return Response.json(openApiDocument(`${base.replace(/\/$/, '')}/v1`), { headers: { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' } })
}
