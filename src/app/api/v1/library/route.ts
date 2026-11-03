import { route } from '@/server/api/route'
import { libraryFacets, searchLibrary } from '@/server/modules/voices'
import { libraryQuerySchema } from '@/lib/schemas/voices'

export const dynamic = 'force-dynamic'

/** GET /api/v1/library — search public voices. ?facets=1 adds filter values. */
export const GET = route({ permission: 'viewContent', scope: 'voices:read' }, async (req, auth) => {
  const sp = new URL(req.url).searchParams
  const q = libraryQuerySchema.parse(Object.fromEntries([...sp].filter(([k, v]) => k !== 'facets' && v !== '')))
  const res = await searchLibrary(auth.workspaceId, q)
  return Response.json(sp.get('facets') ? { ...res, facets: await libraryFacets() } : res)
})
