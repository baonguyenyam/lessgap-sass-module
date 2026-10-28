import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { dashboardRedirectTarget } from "@/lib/tenant-paths"
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
  const { tenant } = await ensureTenant(user)
  const { rest = [] } = await params
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item)
  }
  redirect(dashboardRedirectTarget(tenant.slug, rest, query.toString()))
}
