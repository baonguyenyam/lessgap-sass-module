"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { requireUser } from "@/lib/auth"
import { invitationIsFor, invitationPath, PENDING_INVITATION_COOKIE } from "@/lib/invitations"
import { DASHBOARD, tenantPath } from "@/lib/tenant-paths"
import { findInvitation } from "@/platform/tenancy/invitations"

/**
 * The invitation a form names, if the signed-in person may still answer it:
 * pending, not expired, and sent to their address. Anything else goes back to
 * the invite page, which says why.
 */
async function answerable(formData: FormData) {
  const user = await requireUser()
  const id = String(formData.get("id") ?? "")
  const invitation = id ? await findInvitation(id) : null
  if (!invitation) redirect(DASHBOARD)
  if (invitation.state !== "pending" || !invitationIsFor(invitation.email, user.email)) {
    redirect(invitationPath(invitation.id))
  }
  ;(await cookies()).delete(PENDING_INVITATION_COOKIE)
  return invitation
}

/** Join the tenant with the role the invitation names (task 1.8). Better Auth checks expiry and the address again. */
export async function acceptInvitation(formData: FormData): Promise<void> {
  const invitation = await answerable(formData)
  await auth.api.acceptInvitation({ headers: await headers(), body: { invitationId: invitation.id } })
  redirect(tenantPath(invitation.tenant.slug))
}

/** Turn the invitation down; the inviter sees it as declined. */
export async function declineInvitation(formData: FormData): Promise<void> {
  const invitation = await answerable(formData)
  await auth.api.rejectInvitation({ headers: await headers(), body: { invitationId: invitation.id } })
  redirect(DASHBOARD)
}
