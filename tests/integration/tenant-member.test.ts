import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { db8 } from "@/lib/db8"
import { listMemberTenants, resolveTenantMember } from "@/platform/tenancy/require-member"
import { createMember, createTenant } from "@tests/factories"
import { resetDatabase } from "@tests/helpers/db"

describe("tenant membership on every request (T7)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("drops access on the next request once a member is removed, and narrows it once demoted", async () => {
    const { tenant } = await createTenant({ slug: "t7" })
    const { user, member } = await createMember(tenant.id, { role: "manager" })

    await expect(resolveTenantMember(user.id, "t7", "settings.manage")).resolves.toMatchObject({ tenantId: tenant.id })

    await db8.orm.public.Member.where({ id: member.id }).update({ role: "staff" })
    await expect(resolveTenantMember(user.id, "t7", "settings.manage")).rejects.toMatchObject({ code: "forbidden" })

    await db8.orm.public.Member.where({ id: member.id }).delete()
    await expect(resolveTenantMember(user.id, "t7")).rejects.toMatchObject({ code: "not_found" })
  })

  it("never lets a member of A into B", async () => {
    const a = await createTenant({ slug: "tenant-a" })
    await createTenant({ slug: "tenant-b" })
    await expect(resolveTenantMember(a.owner.id, "tenant-b")).rejects.toMatchObject({ code: "not_found" })
  })

  it("lists the tenants a user can switch to, oldest membership first, without suspended ones (1.7)", async () => {
    const a = await createTenant({ slug: "switch-a", name: "Alpha" })
    const b = await createTenant({ slug: "switch-b", name: "Beta" })
    const c = await createTenant({ slug: "switch-c", name: "Gamma" })
    const { user } = await createMember(b.tenant.id, { role: "staff" })
    await createMember(c.tenant.id, { role: "staff", userId: user.id })
    await db8.orm.public.Member.where({ organizationId: c.tenant.id, userId: user.id }).update({ status: "suspended" })

    expect(await listMemberTenants(user.id)).toEqual([
      expect.objectContaining({ id: b.tenant.id, slug: "switch-b", name: "Beta" }),
    ])
    expect(await listMemberTenants(a.owner.id)).toEqual([
      expect.objectContaining({ id: a.tenant.id, slug: "switch-a", name: "Alpha" }),
    ])
  })
})
