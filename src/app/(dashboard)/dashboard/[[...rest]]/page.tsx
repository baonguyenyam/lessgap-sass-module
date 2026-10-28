import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { dashboardRedirectTarget } from "@/lib/tenant-paths"
import { invitationIsFor, invitationPath, PENDING_INVITATION_COOKIE } from "@/lib/invitations"
import { findInvitation } from "@/platform/tenancy/invitations"
import { ensureTenant } from "@/platform/tenancy/require-member"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/**
 * `/dashboard` and every old `/dashboard/<page>` URL (task 1.7): sends the
 * person to the same page of the tenant they last switched to, or their only
 * one. Account pages stay at `/dashboard/account`, which matches first.
 */
export default async function DashboardEntry({
  params,
  searchParams,
}: {
  params: Promise<{ rest?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireUser()
  // Signed in after opening an invitation link: back to the invitation, while
  // it can still be answered by this account (task 1.8).
  const pendingId = (await cookies()).get(PENDING_INVITATION_COOKIE)?.value
  const invitation = pendingId ? await findInvitation(pendingId) : null
  if (invitation?.state === "pending" && invitationIsFor(invitation.email, user.email)) {
    redirect(invitationPath(invitation.id))
  }
  const { tenant } = await ensureTenant(user)
  const { rest = [] } = await params
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item)
  }
  redirect(dashboardRedirectTarget(tenant.slug, rest, query.toString()))
}
