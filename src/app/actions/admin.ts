"use server"

import type { Role } from "@/lib/roles"

import { getCurrentUser } from "@/lib/auth"
import { db8 } from "@/lib/db8"
import { canChangeRole, isRoot } from "@/lib/roles"
import { userSchema } from "@/lib/schemas/user"
import { getTranslations } from "next-intl/server"
import { revalidatePath } from "next/cache"

/**
 * Sets a user's role to an explicit value.
 *
 * `seenRole` is the role the admin was looking at when they clicked. The write
 * only lands if the row still holds it, which is what stops a stale page from
 * undoing someone else's change: this used to flip whatever it found, so a
 * second admin clicking "Make Admin" on an already promoted user demoted them
 * instead, and said "promoted" while doing it.
 *
 * The role a session carries is re-read from the database at most a minute
 * after this returns (see the jwt callback in src/auth.ts), so the change
 * reaches the other person without them signing out.
 *
 * Only ROOT changes roles, and only between USER and ADMIN
 * (`canChangeRole` in src/lib/roles.ts): ROOT is granted by configuration,
 * never from here, so a hijacked admin session cannot promote itself.
 */
export async function setUserRole(userId: string, nextRole: Role, seenRole: Role) {
  const user = await getCurrentUser()
  if (!user || !isRoot(user.role)) {
    throw new Error("Unauthorized")
  }
  if (nextRole === seenRole) {
    throw new Error("Role is already set to that value")
  }
  if (userId === user.id || !canChangeRole(user.role, seenRole, nextRole)) {
    throw new Error("This role change is not allowed")
  }

  // The filter carries the expected role, so a count of zero means the row
  // moved under us.
  const count = await db8.orm.public.User.where({ id: userId, role: seenRole }).updateAndCount({ role: nextRole })
  if (count === 0) {
    throw new Error("This user's role changed since the page was loaded")
  }

  revalidatePath("/admin")
  return { role: nextRole }
}

/**
 * Edits a user's name from the admin users table. ROOT only, like the admin
 * panel itself; the form's schema is parsed again here.
 */
export async function updateUser(userId: string, values: unknown): Promise<{ error?: string }> {
  const viewer = await getCurrentUser()
  if (!viewer || !isRoot(viewer.role)) throw new Error("Unauthorized")
  const t = await getTranslations("errors")
  const parsed = userSchema({ nameRequired: t("nameRequired"), nameTooLong: t("nameTooLong") }).safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const updated = await db8.orm.public.User.where({ id: userId }).update({ name: parsed.data.name })
  if (!updated) return { error: t("userNotFound") }
  revalidatePath("/admin/users")
  return {}
}

/**
 * Bulk role change from the users table. ROOT only. Each user goes through
 * `canChangeRole` on its own: ROOT accounts and the caller are skipped, never
 * changed. Returns how many rows changed.
 */
export async function setUserRoles(userIds: string[], nextRole: Role): Promise<{ changed: number }> {
  const viewer = await getCurrentUser()
  if (!viewer || !isRoot(viewer.role)) throw new Error("Unauthorized")
  const ids = [...new Set(userIds)].filter((id) => id !== viewer.id).slice(0, 500)
  if (ids.length === 0) return { changed: 0 }

  const users = await db8.orm.public.User.select("id", "role").where((u) => u.id.in(ids)).all()
  const eligible = users.filter((u) => canChangeRole(viewer.role, u.role, nextRole)).map((u) => u.id)
  if (eligible.length === 0) return { changed: 0 }

  const changed = await db8.orm.public.User.where((u) => u.id.in(eligible)).updateAndCount({ role: nextRole })
  revalidatePath("/admin/users")
  return { changed }
}
