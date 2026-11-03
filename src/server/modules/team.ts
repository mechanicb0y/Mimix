import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { and, asc, count, eq, gt, isNull } from 'drizzle-orm'
import type { z } from 'zod'
import { getDb, schema } from '@/server/db'
import type { WorkspaceRole } from '@/server/db/schema'
import { newId } from '@/server/ids'
import { audit } from '@/server/audit'
import { env } from '@/server/env'
import { sendEmail } from '@/server/email'
import { UserError } from '@/server/api/errors'
import { getPlan } from '@/config/plans'
import { getMessages, fmt } from '@/i18n'
import { INVITE_TTL_DAYS, type inviteSchema, type workspacePatchSchema } from '@/lib/schemas/account'

const errs = () => getMessages('en').errors.app.account
const hash = (token: string) => createHash('sha256').update(token).digest('hex')

async function workspaceRow(workspaceId: string) {
  const [w] = await getDb().select().from(schema.workspace).where(eq(schema.workspace.id, workspaceId))
  if (!w) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  return w
}

/** Seats in use: members plus invites that are still open. */
async function seatsUsed(workspaceId: string) {
  const db = getDb()
  const [m] = await db.select({ n: count() }).from(schema.workspaceMember).where(eq(schema.workspaceMember.workspaceId, workspaceId))
  const [i] = await db.select({ n: count() }).from(schema.workspaceInvite)
    .where(and(eq(schema.workspaceInvite.workspaceId, workspaceId), isNull(schema.workspaceInvite.acceptedAt), gt(schema.workspaceInvite.expiresAt, new Date())))
  return { members: m?.n ?? 0, invites: i?.n ?? 0 }
}

/** Seats the workspace may use: the stored seat count (set from the plan), or none for Enterprise. */
function seatLimit(w: { planId: string; seats: number; unlimited: boolean }): number | null {
  if (w.unlimited) return null
  const plan = getPlan(w.planId as never)
  return plan.seats === null ? null : Math.max(plan.seats, w.seats)
}

export async function teamView(workspaceId: string) {
  const db = getDb()
  const w = await workspaceRow(workspaceId)
  const members = await db.select({ userId: schema.user.id, name: schema.user.name, email: schema.user.email, image: schema.user.image, role: schema.workspaceMember.role, joinedAt: schema.workspaceMember.createdAt })
    .from(schema.workspaceMember).innerJoin(schema.user, eq(schema.user.id, schema.workspaceMember.userId))
    .where(eq(schema.workspaceMember.workspaceId, workspaceId)).orderBy(asc(schema.workspaceMember.createdAt))
  const invites = await db.select({ id: schema.workspaceInvite.id, email: schema.workspaceInvite.email, role: schema.workspaceInvite.role, expiresAt: schema.workspaceInvite.expiresAt, createdAt: schema.workspaceInvite.createdAt })
    .from(schema.workspaceInvite)
    .where(and(eq(schema.workspaceInvite.workspaceId, workspaceId), isNull(schema.workspaceInvite.acceptedAt), gt(schema.workspaceInvite.expiresAt, new Date())))
    .orderBy(asc(schema.workspaceInvite.createdAt))
  return { workspace: { id: w.id, name: w.name, planId: w.planId }, seats: seatLimit(w), members, invites }
}

export async function renameWorkspace(workspaceId: string, actorId: string, input: z.infer<typeof workspacePatchSchema>) {
  const w = await workspaceRow(workspaceId)
  await getDb().update(schema.workspace).set({ name: input.name }).where(eq(schema.workspace.id, workspaceId))
  await audit({ actorId, action: 'workspace.renamed', targetType: 'workspace', targetId: workspaceId, before: { name: w.name }, after: { name: input.name } })
}

/** Invites someone by email. The link carries a token whose hash is stored; it works once, for 7 days. */
export async function invite(workspaceId: string, actor: { id: string; name: string }, input: z.infer<typeof inviteSchema>) {
  const db = getDb()
  const w = await workspaceRow(workspaceId)
  const limit = seatLimit(w)
  const used = await seatsUsed(workspaceId)
  if (limit !== null && used.members + used.invites >= limit) {
    throw new UserError('seats_full', limit <= 1 ? errs().soloPlan : fmt(errs().seatsFull, { seats: limit }), 409, undefined, { seats: limit })
  }
  const [existing] = await db.select({ id: schema.user.id }).from(schema.workspaceMember)
    .innerJoin(schema.user, eq(schema.user.id, schema.workspaceMember.userId))
    .where(and(eq(schema.workspaceMember.workspaceId, workspaceId), eq(schema.user.email, input.email)))
  if (existing) throw new UserError('already_member', errs().alreadyMember, 409, { email: errs().alreadyMember })
  const [pending] = await db.select({ id: schema.workspaceInvite.id }).from(schema.workspaceInvite)
    .where(and(eq(schema.workspaceInvite.workspaceId, workspaceId), eq(schema.workspaceInvite.email, input.email), isNull(schema.workspaceInvite.acceptedAt), gt(schema.workspaceInvite.expiresAt, new Date())))
  if (pending) throw new UserError('already_invited', errs().alreadyInvited, 409, { email: errs().alreadyInvited })
  const token = randomBytes(24).toString('base64url')
  const [row] = await db.insert(schema.workspaceInvite).values({
    id: newId('inv'), workspaceId, email: input.email, role: input.role, tokenHash: hash(token), invitedBy: actor.id,
    expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
  }).returning()
  const m = getMessages('en')
  const v = { inviter: actor.name, workspace: w.name, role: m.app.settings.team.roles[input.role], url: `${env().APP_URL}/invite/${token}` }
  await sendEmail({ to: input.email, subject: fmt(m.emails.invite.subject, v), text: `${fmt(m.emails.invite.body, v)}\n\n${m.emails.footer}`, tag: 'invite' })
  await audit({ actorId: actor.id, action: 'workspace.invited', targetType: 'workspace', targetId: workspaceId, after: { email: input.email, role: input.role } })
  return { id: row!.id, email: row!.email, role: row!.role, expiresAt: row!.expiresAt, createdAt: row!.createdAt }
}

export async function revokeInvite(workspaceId: string, id: string, actorId: string) {
  const [row] = await getDb().delete(schema.workspaceInvite).where(and(eq(schema.workspaceInvite.id, id), eq(schema.workspaceInvite.workspaceId, workspaceId), isNull(schema.workspaceInvite.acceptedAt))).returning()
  if (!row) throw new UserError('not_found', getMessages('en').errors.app.notFound, 404)
  await audit({ actorId, action: 'workspace.invite_revoked', targetType: 'workspace', targetId: workspaceId, after: { email: row.email } })
}

/** What the invite page shows before accepting. Null when the token is unknown, used or expired. */
export async function peekInvite(token: string) {
  const [r] = await getDb().select({ inv: schema.workspaceInvite, ws: schema.workspace.name }).from(schema.workspaceInvite)
    .innerJoin(schema.workspace, eq(schema.workspace.id, schema.workspaceInvite.workspaceId))
    .where(eq(schema.workspaceInvite.tokenHash, hash(token)))
  if (!r || r.inv.acceptedAt || r.inv.expiresAt <= new Date()) return null
  return { workspaceId: r.inv.workspaceId, workspace: r.ws, email: r.inv.email, role: r.inv.role }
}

/** Accepts an invite for the signed-in user, whose email must match the invited address. */
export async function acceptInvite(token: string, user: { id: string; email: string }) {
  const db = getDb()
  const [inv] = await db.select().from(schema.workspaceInvite).where(eq(schema.workspaceInvite.tokenHash, hash(token)))
  if (!inv || inv.acceptedAt || inv.expiresAt <= new Date()) throw new UserError('invite_invalid', errs().inviteInvalid, 410)
  if (inv.email.toLowerCase() !== user.email.toLowerCase()) throw new UserError('invite_wrong_email', fmt(errs().inviteWrongEmail, { email: inv.email }), 403)
  await db.transaction(async (tx) => {
    await tx.update(schema.workspaceInvite).set({ acceptedAt: new Date() }).where(eq(schema.workspaceInvite.id, inv.id))
    await tx.insert(schema.workspaceMember).values({ workspaceId: inv.workspaceId, userId: user.id, role: inv.role }).onConflictDoNothing()
  })
  await audit({ actorId: user.id, action: 'workspace.joined', targetType: 'workspace', targetId: inv.workspaceId, after: { role: inv.role } })
  return { workspaceId: inv.workspaceId }
}

async function memberRole(workspaceId: string, userId: string): Promise<WorkspaceRole> {
  const [m] = await getDb().select({ role: schema.workspaceMember.role }).from(schema.workspaceMember)
    .where(and(eq(schema.workspaceMember.workspaceId, workspaceId), eq(schema.workspaceMember.userId, userId)))
  if (!m) throw new UserError('not_member', errs().notMember, 404)
  return m.role
}

/** Admins can change members and viewers; only the owner can change admins. Nobody changes their own role. */
export async function changeRole(workspaceId: string, actor: { id: string; role: WorkspaceRole }, userId: string, role: WorkspaceRole) {
  if (userId === actor.id) throw new UserError('self_role', errs().selfRole, 409)
  const current = await memberRole(workspaceId, userId)
  if (current === 'owner') throw new UserError('owner_role', errs().ownerRole, 409)
  if ((current === 'admin' || role === 'admin') && actor.role !== 'owner') throw new UserError('forbidden', getMessages('en').errors.app.forbidden, 403)
  await getDb().update(schema.workspaceMember).set({ role }).where(and(eq(schema.workspaceMember.workspaceId, workspaceId), eq(schema.workspaceMember.userId, userId)))
  await audit({ actorId: actor.id, action: 'workspace.role_changed', targetType: 'user', targetId: userId, before: { role: current }, after: { role, workspaceId } })
}

/** Removes someone, or lets a member leave (userId === actor). The owner can't leave or be removed. */
export async function removeMember(workspaceId: string, actor: { id: string; role: WorkspaceRole }, userId: string) {
  const current = await memberRole(workspaceId, userId)
  if (current === 'owner') throw new UserError('last_owner', errs().lastOwner, 409)
  const self = userId === actor.id
  if (!self && !(actor.role === 'owner' || (actor.role === 'admin' && current !== 'admin'))) throw new UserError('forbidden', getMessages('en').errors.app.forbidden, 403)
  const db = getDb()
  await db.delete(schema.workspaceMember).where(and(eq(schema.workspaceMember.workspaceId, workspaceId), eq(schema.workspaceMember.userId, userId)))
  // Their keys stop working with them.
  await db.update(schema.apiKey).set({ revokedAt: new Date() }).where(and(eq(schema.apiKey.workspaceId, workspaceId), eq(schema.apiKey.createdBy, userId), isNull(schema.apiKey.revokedAt)))
  const [u] = await db.select({ defaultWorkspaceId: schema.user.defaultWorkspaceId }).from(schema.user).where(eq(schema.user.id, userId))
  if (u?.defaultWorkspaceId === workspaceId) await db.update(schema.user).set({ defaultWorkspaceId: null }).where(eq(schema.user.id, userId))
  await audit({ actorId: actor.id, action: self ? 'workspace.left' : 'workspace.member_removed', targetType: 'user', targetId: userId, after: { workspaceId } })
}

/** The owner hands the workspace to an admin and becomes an admin. */
export async function transferOwnership(workspaceId: string, ownerId: string, toUserId: string) {
  if (toUserId === ownerId) throw new UserError('transfer_target', errs().transferTarget, 409)
  const target = await memberRole(workspaceId, toUserId)
  if (target !== 'admin') throw new UserError('transfer_target', errs().transferTarget, 409)
  const db = getDb()
  await db.transaction(async (tx) => {
    await tx.update(schema.workspaceMember).set({ role: 'owner' }).where(and(eq(schema.workspaceMember.workspaceId, workspaceId), eq(schema.workspaceMember.userId, toUserId)))
    await tx.update(schema.workspaceMember).set({ role: 'admin' }).where(and(eq(schema.workspaceMember.workspaceId, workspaceId), eq(schema.workspaceMember.userId, ownerId)))
  })
  await audit({ actorId: ownerId, action: 'workspace.ownership_transferred', targetType: 'workspace', targetId: workspaceId, after: { owner: toUserId } })
}
