"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getCurrentUser, getSwitchedBy } from "@/lib/auth"
import { db8 } from "@/lib/db8"
import { canSwitchAs } from "@/lib/roles"

/**
 * Switch As (spec/adr/0015-switch-as.md): ROOT opens a session as another
 * account, and switches back. The endpoints in src/auth.ts apply the same rule;
 * it is checked here first so a refusal never reaches the auth library.
 */
export async function startSwitchAs(userId: string) {
  const actor = await getCurrentUser()
  if (!actor) throw new Error("Unauthorized")

  const target = await db8.orm.public.User.select("id", "role").where({ id: userId }).first()
  if (!target) throw new Error("User not found")

  const switched = (await getSwitchedBy()) !== null
  if (!canSwitchAs({ id: actor.id, role: actor.role, switched }, target)) {
    throw new Error("Switch As is not allowed for this account")
  }

  await auth.api.switchAsStart({ body: { userId }, headers: await headers() })
  redirect("/dashboard")
}

export async function stopSwitchAs() {
  if ((await getSwitchedBy()) === null) redirect("/dashboard")

  const { restored } = await auth.api.switchAsStop({ headers: await headers() })
  redirect(restored ? "/admin" : "/login")
}
