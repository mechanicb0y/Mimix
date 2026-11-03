import { pronunciationRuleSchema } from '@/lib/schemas/tts'
import { body, route } from '@/server/api/route'
import { listRules, upsertRule } from '@/server/modules/tts'

export const dynamic = 'force-dynamic'

export const GET = route({ permission: 'viewContent', scope: 'tts' }, async (_req, auth) => Response.json({ items: await listRules(auth.workspaceId) }))

export const POST = route({ permission: 'generate', scope: 'tts' }, async (req, auth) => {
  const rule = await upsertRule(auth.workspaceId, await body(req, pronunciationRuleSchema))
  return Response.json(rule, { status: 201 })
})
