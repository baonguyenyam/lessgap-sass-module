import { redirect } from "next/navigation"
import { db8 } from "@/lib/db8"
import { requireUser, type CurrentUser } from "@/lib/auth"
import type { PlatformRole } from "@/platform/tenancy/context"

/**
 * The platform-console gate (spec/02-tenancy.md, "Platform staff"): the
 * signed-in user must hold a `platformRole`, which is separate from every
 * tenant membership and from the kit `role` — a ROOT without one is refused
 * too (T10).
 *
 * The role is read off the User row on every call, not the session: a role
 * revoked in the database closes the console on the next request, the same
 * freshness T7 asks of memberships. A non-staff user is sent to the
 * dashboard, the way a non-ROOT is sent away from `/admin`.
 */
export async function requirePlatformRole(): Promise<{ user: CurrentUser; platformRole: PlatformRole }> {
  const user = await requireUser()
  const row = await db8.orm.public.User.select("platformRole").where({ id: user.id }).first()
  if (!row?.platformRole) redirect("/dashboard")
  return { user, platformRole: row.platformRole }
}
