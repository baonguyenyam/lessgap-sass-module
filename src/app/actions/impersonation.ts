"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { IMPERSONATABLE_ROLES } from "@/platform/tenancy/context"
import { requirePlatformRole } from "@/platform/staff"

const input = z.object({ tenantId: z.string().min(1), reason: z.string().trim().min(1).max(500) })

/**
 * Open a tenant's dashboard as its owner (task 1.11): a written reason is
 * required, support and above only, and the session expires after 60 minutes
 * like every Switch As session. The endpoint checks again before acting.
 */
export async function startImpersonation(values: unknown): Promise<{ error?: string }> {
  const { platformRole } = await requirePlatformRole()
  if (!IMPERSONATABLE_ROLES.includes(platformRole)) return { error: "forbidden" }
  const parsed = input.safeParse(values)
  if (!parsed.success) return { error: "reasonRequired" }

  const tenant = await db8.orm.public.Tenant.select("id", "slug", "status").where({ id: parsed.data.tenantId }).first()
  if (!tenant || tenant.status === "SUSPENDED" || tenant.status === "CANCELED") return { error: "notFound" }
  await auth.api.impersonateStart({
    headers: await headers(),
    body: { tenantId: tenant.id, reason: parsed.data.reason },
  })
  redirect(`/t/${tenant.slug}`)
}

/** End the impersonation: the switched session stops and staff lands back on the console. */
export async function stopImpersonation() {
  await auth.api.switchAsStop({ headers: await headers() })
  redirect("/platform/tenants")
}
