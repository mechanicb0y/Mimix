import { completeUpload } from '@/server/uploads'
import { route } from '@/server/api/route'

export const dynamic = 'force-dynamic'

/** POST /api/v1/uploads/{id}/complete — step 2: checks the real size and type of the uploaded file. */
export const POST = route<{ id: string }>({ permission: 'generate', scope: 'any' }, async (_req, auth, { id }) =>
  Response.json(await completeUpload(auth.workspaceId, id)))
