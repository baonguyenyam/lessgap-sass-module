import type { FieldOutputTypes } from "@/generated/prisma8/contract.d"

/**
 * Who may do what, in one place (spec/adr/0014-root-role.md).
 *
 *   USER  <  ADMIN  <  ROOT
 *
 * - ADMIN runs the admin panel: users, revenue, the newsletter list.
 * - ROOT is above every admin: it alone changes roles. ROOT is granted only by configuration (`ROOT_EMAILS`,
 *   applied by the seeds), never from the UI, so a stolen admin session
 *   cannot make itself ROOT.
 *
 * Every role check in the app goes through these functions. Comparing
 * `role === "ADMIN"` inline is how a ROOT account ends up locked out of a page
 * an admin can open.
 */
export type Role = FieldOutputTypes["public"]["User"]["role"]

export const ROLES = ["USER", "ADMIN", "ROOT"] as const satisfies readonly Role[]

const RANK: Record<Role, number> = { USER: 0, ADMIN: 1, ROOT: 2 }

/** Roles the UI may assign. ROOT is never one of them. */
export const ASSIGNABLE_ROLES = ["USER", "ADMIN"] as const satisfies readonly Role[]

export const isRole = (value: unknown): value is Role => typeof value === "string" && value in RANK

/** ADMIN or above: may open the admin panel. */
export function isAdmin(role: Role | null | undefined): boolean {
  return role != null && RANK[role] >= RANK.ADMIN
}

/** ROOT: the whole system. */
export function isRoot(role: Role | null | undefined): boolean {
  return role === "ROOT"
}

/**
 * Whether `actor` may move a user from `current` to `next`. Only ROOT changes
 * roles, never to or from ROOT, and never to the role the user already has.
 */
export function canChangeRole(actor: Role, current: Role, next: Role): boolean {
  if (!isRoot(actor)) return false
  if (current === next) return false
  return (ASSIGNABLE_ROLES as readonly Role[]).includes(current) && (ASSIGNABLE_ROLES as readonly Role[]).includes(next)
}
