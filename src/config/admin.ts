import type { Role } from '@/server/db/schema'

/**
 * Admin console permissions (brief section 8). Checked on the server for every admin page and
 * every /api/admin call; the console only hides what a role can't use as a convenience.
 *
 * Owner: everything, including roles. Admin: runs the platform but can't change roles.
 * Moderator: trust and safety. Support: helps users (credits, 2FA resets, view as user).
 */
export const STAFF_ROLES = ['owner', 'admin', 'moderator', 'support'] as const satisfies readonly Role[]
export type StaffRole = (typeof STAFF_ROLES)[number]

export const ADMIN_PERMISSIONS = {
  viewOverview: ['owner', 'admin', 'moderator', 'support'],
  viewUsers: ['owner', 'admin', 'moderator', 'support'],
  viewAsUser: ['owner', 'admin', 'support'],
  adjustCredits: ['owner', 'admin', 'support'],
  changePlan: ['owner', 'admin'],
  suspendUsers: ['owner', 'admin', 'moderator'],
  banUsers: ['owner', 'admin'],
  resetTwoFactor: ['owner', 'admin', 'support'],
  manageRoles: ['owner'],
  moderateVoices: ['owner', 'admin', 'moderator'],
  viewGenerations: ['owner', 'admin', 'moderator', 'support'],
  moderateGenerations: ['owner', 'admin', 'moderator'],
  managePlans: ['owner', 'admin'],
  manageFlags: ['owner', 'admin'],
  viewDevelopers: ['owner', 'admin', 'support'],
  manageDevelopers: ['owner', 'admin'],
  viewSystem: ['owner', 'admin'],
  viewAudit: ['owner', 'admin'],
} as const satisfies Record<string, readonly StaffRole[]>
export type AdminPermission = keyof typeof ADMIN_PERMISSIONS

/** Rank used for "act only on a lower role". Owners may also act on other Owners (brief section 8). */
export const ROLE_RANK: Record<string, number> = { user: 0, support: 1, moderator: 2, admin: 3, owner: 4 }

/** Whether `actor` may act on an account with role `target` (never on themselves; checked separately). */
export function outranks(actor: string, target: string): boolean {
  if (actor === 'owner') return true
  return (ROLE_RANK[actor] ?? 0) > (ROLE_RANK[target] ?? 0)
}

export function isStaff(role: string | null | undefined): role is StaffRole {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role)
}

export function adminCan(role: string | null | undefined, permission: AdminPermission): boolean {
  return isStaff(role) && (ADMIN_PERMISSIONS[permission] as readonly string[]).includes(role)
}

/** Admin session rules. */
export const ADMIN_SECURITY = {
  /** The console locks after this long without a request, until the password is entered again. */
  idleMinutes: 15,
  /** A destructive action needs a re-authentication at most this old. */
  reauthMinutes: 5,
} as const

/** Product-limit multiplier for the super-admin (security limits such as sign-in attempts are unchanged). */
export const OWNER_RATE_MULTIPLIER = 10

/** Console sections, in sidebar order, with the permission each needs. Labels: admin.nav. */
export const ADMIN_NAV = [
  { key: 'overview', href: '/admin', permission: 'viewOverview' },
  { key: 'users', href: '/admin/users', permission: 'viewUsers' },
  { key: 'voices', href: '/admin/voices', permission: 'moderateVoices' },
  { key: 'generations', href: '/admin/generations', permission: 'viewGenerations' },
  { key: 'plans', href: '/admin/plans', permission: 'managePlans' },
  { key: 'flags', href: '/admin/flags', permission: 'manageFlags' },
  { key: 'developers', href: '/admin/developers', permission: 'viewDevelopers' },
  { key: 'system', href: '/admin/system', permission: 'viewSystem' },
  { key: 'audit', href: '/admin/audit', permission: 'viewAudit' },
] as const satisfies ReadonlyArray<{ key: string; href: string; permission: AdminPermission }>
export type AdminNavKey = (typeof ADMIN_NAV)[number]['key']
