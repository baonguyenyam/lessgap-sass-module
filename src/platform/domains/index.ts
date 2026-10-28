import { db8 } from "@/lib/db8"
import { nowTs } from "@/lib/timestamps"
import { audit } from "@/platform/audit"
import { AppError } from "@/platform/errors"
import { domainProvider, type DnsRecord } from "@/platform/domains/provider"
import type { TenantContext } from "@/platform/tenancy/context"
import { actingUserId } from "@/platform/tenancy/context"

/**
 * The custom-domain lifecycle (task 3.7, spec/03): add → `pending` (provider
 * told, DNS records shown), `platform.domain.verify` re-checks, verified →
 * `active`, primary → every other hostname 308s to it.
 */
export async function addDomain(ctx: TenantContext, hostname: string) {
  const name = hostname.trim().toLowerCase()
  if (!name || name.endsWith(`.${"localhost"}`) || !name.includes(".")) {
    throw new AppError("invalid_input", { field: "hostname" })
  }
  const claimed = await db8.orm.public.Domain.where({ hostname: name }).first()
  if (claimed) throw new AppError("conflict", { field: "hostname" })

  const result = await domainProvider().addDomain(name)
  const row = await db8.orm.public.Domain.create({
    tenantId: ctx.tenantId,
    hostname: name,
    status: result.status,
    verification: { records: result.records as DnsRecord[] },
  })
  await audit(ctx, {
    action: "domain.added",
    targetType: "Domain",
    targetId: row.id,
    data: { hostname: name },
  })
  return row
}

export async function checkDomain(ctx: TenantContext, hostname: string) {
  const row = await db8.orm.public.Domain.where({ tenantId: ctx.tenantId, hostname: hostname.toLowerCase() }).first()
  if (!row) throw new AppError("not_found")
  const result = await domainProvider().checkDomain(row.hostname)
  await db8.orm.public.Domain.where({ id: row.id }).update({
    status: result.status,
    verification: { records: result.records },
    verifiedAt: result.status === "active" ? nowTs() : row.verifiedAt,
    lastCheckedAt: nowTs(),
  })
  if (result.status === "active" && row.status !== "active") {
    await audit(ctx, {
      action: "domain.activated",
      targetType: "Domain",
      targetId: row.id,
      data: { hostname: row.hostname },
    })
  }
  return result
}

export async function removeDomain(ctx: TenantContext, hostname: string) {
  const row = await db8.orm.public.Domain.where({ tenantId: ctx.tenantId, hostname: hostname.toLowerCase() }).first()
  if (!row) throw new AppError("not_found")
  await domainProvider().removeDomain(row.hostname)
  await db8.orm.public.Domain.where({ id: row.id }).delete()
  await audit(ctx, {
    action: "domain.removed",
    targetType: "Domain",
    targetId: row.id,
    data: { hostname: row.hostname, by: actingUserId(ctx) },
  })
}

/** One domain is primary; all the tenant's other hostnames 308 to it. */
export async function setPrimaryDomain(ctx: TenantContext, hostname: string) {
  const name = hostname.toLowerCase()
  const row = await db8.orm.public.Domain.where({ tenantId: ctx.tenantId, hostname: name, status: "active" }).first()
  if (!row) throw new AppError("not_found")
  await Promise.all([
    db8.orm.public.Domain.where({ tenantId: ctx.tenantId, isPrimary: true }).update({ isPrimary: false }),
    db8.orm.public.Domain.where({ id: row.id }).update({ isPrimary: true }),
  ])
  await audit(ctx, {
    action: "domain.primary_changed",
    targetType: "Domain",
    targetId: row.id,
    data: { hostname: name },
  })
}

/** The primary active domain's hostname — the site's canonical origin. */
export async function primaryDomain(tenantId: string): Promise<string | null> {
  const row = await db8.orm.public.Domain.where({ tenantId, isPrimary: true, status: "active" }).first()
  return row?.hostname ?? null
}
