"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { slugify } from "@/lib/slugify"
import { createTenantSchema } from "@/lib/schemas/platform"
import { audit, platformAuditContext } from "@/platform/audit"
import { enqueueJob } from "@/platform/jobs/runner"
import { requirePlatformRole } from "@/platform/staff"

const TENANTS = "/platform/tenants"

/**
 * Create a tenant for an existing account (phase-1 decision 1-B: staff-created
 * only). `createOrganization` with `userId` and no session is the plugin's
 * system action: the named user — never the staff member — becomes the owner.
 * The slug comes from the name, suffixed until free, like `ensureTenant`.
 */
export async function createTenantFor(values: unknown): Promise<{ error?: string }> {
  const { user } = await requirePlatformRole()
  const t = await getTranslations("platform.tenants.errors")
  const parsed = createTenantSchema({ nameRequired: t("nameRequired"), invalidEmail: t("invalidEmail") }).safeParse(
    values
  )
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const owner = await db8.orm.public.User.select("id").where({ email: parsed.data.ownerEmail }).first()
  if (!owner) return { error: t("ownerNotFound") }

  const base = slugify(parsed.data.name)
  let slug = base
  for (let i = 2; await db8.orm.public.Tenant.where({ slug }).first(); i++) slug = `${base}-${i}`

  const tenant = await auth.api.createOrganization({
    body: { name: parsed.data.name, slug, userId: owner.id },
  })
  // Same flip `ensureTenant` does until the onboarding wizard owns it.
  await db8.orm.public.Tenant.where({ id: tenant.id, status: "PROVISIONING" }).update({ status: "ACTIVE" })
  await audit(platformAuditContext(user.id, tenant.id), {
    action: "platform.tenant.created",
    targetType: "tenant",
    targetId: tenant.id,
    data: { slug, ownerId: owner.id },
  })
  revalidatePath(TENANTS, "page")
  return {}
}

/**
 * Suspend or reactivate a tenant. Suspending needs a written reason — the
 * suspension itself, not the reason, is what a member can never see: their
 * next request answers not_found (task 1.10, `resolveTenantMember`).
 */
export async function setTenantStatus(
  tenantId: string,
  status: "SUSPENDED" | "ACTIVE",
  reason?: string
): Promise<{ error?: string }> {
  const { user } = await requirePlatformRole()
  const t = await getTranslations("platform.tenants.errors")
  if (status !== "SUSPENDED" && status !== "ACTIVE") return { error: t("invalidStatus") }

  const tenant = await db8.orm.public.Tenant.select("id", "slug", "status").where({ id: tenantId }).first()
  if (!tenant) return { error: t("notFound") }
  if (tenant.status === status) return {}

  const trimmed = reason?.trim() ?? ""
  if (status === "SUSPENDED" && !trimmed) return { error: t("reasonRequired") }

  await db8.orm.public.Tenant.where({ id: tenantId }).update({ status })
  await audit(platformAuditContext(user.id, tenantId), {
    action: status === "SUSPENDED" ? "platform.tenant.suspended" : "platform.tenant.reactivated",
    targetType: "tenant",
    targetId: tenantId,
    reason: trimmed || undefined,
  })
  revalidatePath(TENANTS, "page")
  revalidatePath(`${TENANTS}/${tenant.slug}`, "page")
  return {}
}

/**
 * Deletes a tenant (task 1.14): the typed slug is the confirmation, the tenant
 * is CANCELED immediately so members lose access, then a
 * `platform.tenant.delete` job purges every tenant-owned row and the tenant
 * itself. The audit row survives — AuditLog is platform-private.
 */
export async function deleteTenant(slug: string, confirmSlug: string): Promise<{ error?: string }> {
  const { user } = await requirePlatformRole()
  const t = await getTranslations("platform.tenants.errors")

  const tenant = await db8.orm.public.Tenant.select("id", "slug", "status").where({ slug }).first()
  if (!tenant) return { error: t("notFound") }
  if (confirmSlug.trim() !== tenant.slug) return { error: t("confirmMismatch") }

  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "CANCELED" })
  const jobId = await enqueueJob("platform.tenant.delete", { tenantId: tenant.id }, { tenantId: tenant.id })
  await audit(platformAuditContext(user.id, tenant.id), {
    action: "platform.tenant.deletion_requested",
    targetType: "tenant",
    targetId: tenant.id,
    data: { jobId },
  })
  revalidatePath(TENANTS, "page")
  return {}
}
