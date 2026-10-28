import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { db8 } from "@/lib/db8"
import { createMember, createTenant } from "@tests/factories"
import { resetDatabase } from "@tests/helpers/db"

// Phase 1, task 1.2: tenants and members through the Better Auth organization plugin.
describe("tenants and members", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("creates a tenant with its owner as the first member", async () => {
    const { tenant, owner } = await createTenant({ name: "Phở Hà Nội", slug: "pho-ha-noi" })
    expect(tenant).toMatchObject({ name: "Phở Hà Nội", slug: "pho-ha-noi" })
    const members = await db8.orm.public.Member.where({ organizationId: tenant.id }).all()
    expect(members).toHaveLength(1)
    expect(members[0]).toMatchObject({ userId: owner.id, role: "owner" })
  })

  it("adds a member with a built-in role", async () => {
    const { tenant } = await createTenant()
    const { member } = await createMember(tenant.id, { role: "manager" })
    expect(member).toMatchObject({ organizationId: tenant.id, role: "manager" })
    expect(await db8.orm.public.Member.where({ organizationId: tenant.id }).all()).toHaveLength(2)
  })

  it("refuses a second tenant with the same slug", async () => {
    await createTenant({ slug: "taken" })
    await expect(createTenant({ slug: "taken" })).rejects.toThrow()
  })
})
