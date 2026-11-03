import 'server-only'
import { getDb, schema, type Tx } from '@/server/db'
import { newId } from '@/server/ids'

/** Appends one row to the audit log (append-only; the database rejects updates and deletes). */
export async function audit(entry: {
  actorId?: string | null; actorRole?: string | null; action: string; targetType?: string; targetId?: string
  before?: unknown; after?: unknown; reason?: string; ipAddress?: string | null
}, tx?: Tx): Promise<void> {
  await (tx ?? getDb()).insert(schema.auditLog).values({
    id: newId('aud'), actorId: entry.actorId ?? null, actorRole: entry.actorRole ?? null, action: entry.action,
    targetType: entry.targetType ?? null, targetId: entry.targetId ?? null, before: entry.before ?? null,
    after: entry.after ?? null, reason: entry.reason ?? null, ipAddress: entry.ipAddress ?? null,
  })
}
