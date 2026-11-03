import { createUploadSchema } from '@/lib/schemas/uploads'
import { createUpload } from '@/server/uploads'
import { actorOf, body, route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/uploads — step 1 of an upload. Returns a signed URL; PUT the file there with the
 * returned headers, then call POST /api/v1/uploads/{id}/complete. Uploads unused after 24 hours are deleted.
 */
export const POST = route({ permission: 'generate', scope: 'any' }, async (req, auth) =>
  Response.json(await createUpload(actorOf(auth), await body(req, createUploadSchema)), { status: 201 }))
