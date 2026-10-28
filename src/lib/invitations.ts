import type { Route } from "next"

/** The cookie that brings someone back to an invitation after they sign in or sign up (task 1.8). */
export const PENDING_INVITATION_COOKIE = "pending_invitation"

export type InvitationState = "pending" | "expired" | "accepted" | "rejected" | "canceled"

/**
 * What an invitation can still do. Better Auth keeps `status: "pending"` on an
 * invitation past its `expiresAt`, so the date decides between pending and
 * expired; any status it does not know reads as canceled.
 */
export function invitationState(invitation: { status: string; expiresAt: Date }, now: Date): InvitationState {
  if (invitation.status === "pending") return invitation.expiresAt.getTime() > now.getTime() ? "pending" : "expired"
  if (invitation.status === "accepted" || invitation.status === "rejected") return invitation.status
  return "canceled"
}

/** Whether an invitation sent to `invited` is for the account signed in as `signedIn`. */
export function invitationIsFor(invited: string, signedIn: string | null | undefined): boolean {
  return Boolean(signedIn) && invited.trim().toLowerCase() === signedIn!.trim().toLowerCase()
}

/** The page an invitation email links to. */
export function invitationPath(id: string): Route {
  return `/invite/${encodeURIComponent(id)}` as Route
}

/** The invitation id of an `/invite/<id>` path, or null. */
export function invitationIdFromPath(pathname: string): string | null {
  const match = /^\/invite\/([A-Za-z0-9_-]{1,64})\/?$/.exec(pathname)
  return match ? match[1] : null
}

/**
 * Whether `actorRole` may hand out `role`, on an invitation or a role change.
 * Only an owner makes another owner: anyone else allowed to invite could
 * otherwise invite themselves a second account with every permission.
 */
export function mayGrantRole(actorRole: string, role: string): boolean {
  return role !== "owner" || actorRole === "owner"
}
