import 'server-only'
import { and, eq } from 'drizzle-orm'
import { getDb, schema, type Tx } from '@/server/db'
import type { WorkspaceRole } from '@/server/db/schema'
import { newId } from '@/server/ids'
import { resetPlanCredits } from '@/server/credits'
import { getPlan } from '@/config/plans'
import { env } from '@/server/env'

/** What each workspace role may do. Checked on every server action and API route. */
export const PERMISSIONS = {
  generate: ['owner', 'admin', 'member'],
  viewContent: ['owner', 'admin', 'member', 'viewer'],
  manageVoices: ['owner', 'admin', 'member'],
  manageMembers: ['owner', 'admin'],
  manageBilling: ['owner'],
  manageApiKeys: ['owner', 'admin'],
  manageWebhooks: ['owner', 'admin'],
  viewUsage: ['owner', 'admin', 'member', 'viewer'],
  deleteWorkspace: ['owner'],
} as const satisfies Record<string, readonly WorkspaceRole[]>
export type Permission = keyof typeof PERMISSIONS

export class ForbiddenError extends Error {
  constructor(message = 'You don’t have permission to do that in this workspace.') { super(message); this.name = 'ForbiddenError' }
}

export function can(role: WorkspaceRole | null | undefined, permission: Permission): boolean {
  return !!role && (PERMISSIONS[permission] as readonly string[]).includes(role)
}

export async function getMembership(workspaceId: string, userId: string) {
  const [m] = await getDb().select({ role: schema.workspaceMember.role, workspace: schema.workspace })
    .from(schema.workspaceMember)
    .innerJoin(schema.workspace, eq(schema.workspace.id, schema.workspaceMember.workspaceId))
    .where(and(eq(schema.workspaceMember.workspaceId, workspaceId), eq(schema.workspaceMember.userId, userId)))
  return m ?? null
}

/** Any workspace the user still belongs to (used when the chosen and default ones are gone). */
export async function anyMembership(userId: string) {
  const [w] = await getDb().select({ id: schema.workspaceMember.workspaceId }).from(schema.workspaceMember).where(eq(schema.workspaceMember.userId, userId)).limit(1)
  return w ? getMembership(w.id, userId) : null
}

/** Loads the membership and throws ForbiddenError unless the role grants `permission`. */
export async function requirePermission(workspaceId: string, userId: string, permission: Permission) {
  const m = await getMembership(workspaceId, userId)
  if (!m || !can(m.role, permission)) throw new ForbiddenError()
  return m
}

export async function listWorkspaces(userId: string) {
  return getDb().select({ id: schema.workspace.id, name: schema.workspace.name, planId: schema.workspace.planId, role: schema.workspaceMember.role })
    .from(schema.workspaceMember)
    .innerJoin(schema.workspace, eq(schema.workspace.id, schema.workspaceMember.workspaceId))
    .where(eq(schema.workspaceMember.userId, userId))
}

/** Creates a user's personal workspace on the Free plan with its monthly credits. */
export async function createPersonalWorkspace(user: { id: string; name: string }, tx?: Tx): Promise<string> {
  const run = async (t: Tx) => {
    const id = newId('ws')
    const first = user.name.trim().split(/\s+/)[0] || 'My'
    await t.insert(schema.workspace).values({ id, name: `${first}’s workspace`.slice(0, 80) })
    await t.insert(schema.workspaceMember).values({ workspaceId: id, userId: user.id, role: 'owner' })
    await t.update(schema.user).set({ defaultWorkspaceId: id }).where(eq(schema.user.id, user.id))
    const free = getPlan('free')
    await resetPlanCredits({ workspaceId: id, allowance: free.creditsPerMonth ?? 0, reason: 'plan_grant', tx: t })
    return id
  }
  return tx ? run(tx) : getDb().transaction(run)
}

/**
 * The super-admin (ADMIN_EMAIL) becomes platform Owner once their email is verified: role "owner"
 * and unlimited credits on their workspaces. Verification first, so registering the address
 * without access to its inbox gains nothing.
 */
export async function promoteSuperAdminIfVerified(user: { id: string; email: string; emailVerified: boolean }): Promise<boolean> {
  const admin = env().ADMIN_EMAIL?.toLowerCase()
  if (!admin || !user.emailVerified || user.email.toLowerCase() !== admin) return false
  await getDb().transaction(async (tx) => {
    await tx.update(schema.user).set({ role: 'owner' }).where(eq(schema.user.id, user.id))
    const owned = await tx.select({ id: schema.workspaceMember.workspaceId }).from(schema.workspaceMember)
      .where(and(eq(schema.workspaceMember.userId, user.id), eq(schema.workspaceMember.role, 'owner')))
    for (const w of owned) await tx.update(schema.workspace).set({ unlimited: true }).where(eq(schema.workspace.id, w.id))
    await tx.insert(schema.auditLog).values({ id: newId('aud'), actorId: user.id, action: 'user.promoted_owner', actorRole: 'system', targetType: 'user', targetId: user.id, after: { role: 'owner', unlimited: true }, reason: 'ADMIN_EMAIL verified' })
  })
  return true
}
