import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { AppError } from "@/platform/errors"
import { resolveTenantMember } from "@/platform/tenancy/require-member"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/**
 * Every page of one tenant's dashboard (task 1.7). Someone who is not a member
 * gets the 404 page, so a slug cannot be used to learn that a tenant exists (T6).
 */
export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const user = await requireUser()
  try {
    await resolveTenantMember(user.id, slug)
  } catch (error) {
    if (error instanceof AppError && error.code === "not_found") notFound()
    throw error
  }
  return children
}
