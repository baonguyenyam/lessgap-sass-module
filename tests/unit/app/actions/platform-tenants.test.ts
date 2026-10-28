import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const api = { createOrganization: vi.fn() }
const staff = { user: { id: "staff-1" }, platformRole: "ADMIN" }

vi.mock("@/auth", () => ({ auth: { api } }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/platform/staff", () => ({ requirePlatformRole: async () => staff }))
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { createTenantFor, setTenantStatus } = await import("@/app/actions/platform-tenants")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

beforeEach(() => {
  db.reset()
  api.createOrganization.mockReset().mockResolvedValue({ id: "t-new" })
  db.fn("User.first").mockResolvedValue({ id: "owner-1" })
  db.fn("Tenant.first").mockResolvedValue(null)
})

describe("createTenantFor", () => {
  it("parses the form again and refuses an unknown owner", async () => {
    await expect(createTenantFor({ name: "", ownerEmail: "a@example.com" })).resolves.toEqual({ error: "nameRequired" })
    await expect(createTenantFor({ name: "Rosy", ownerEmail: "nope" })).resolves.toEqual({ error: "invalidEmail" })
    db.fn("User.first").mockResolvedValue(null)
    await expect(createTenantFor({ name: "Rosy", ownerEmail: "a@example.com" })).resolves.toEqual({
      error: "ownerNotFound",
    })
    expect(api.createOrganization).not.toHaveBeenCalled()
  })

  it("creates the tenant for the owner, not the staff member, and audits it", async () => {
    await expect(createTenantFor({ name: "Rosy Nails", ownerEmail: "a@example.com" })).resolves.toEqual({})
    expect(api.createOrganization).toHaveBeenCalledWith({
      body: { name: "Rosy Nails", slug: "rosy-nails", userId: "owner-1" },
    })
    expect(db.fn("Tenant.update")).toHaveBeenCalledWith({ status: "ACTIVE" })
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t-new",
        actorId: "staff-1",
        actorKind: "platform",
        action: "platform.tenant.created",
        targetType: "tenant",
        targetId: "t-new",
      })
    )
  })

  it("suffixes the slug until it is free", async () => {
    db.fn("Tenant.first").mockResolvedValueOnce({ id: "t1" }).mockResolvedValueOnce(null)
    await expect(createTenantFor({ name: "Rosy Nails", ownerEmail: "a@example.com" })).resolves.toEqual({})
    expect(api.createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ slug: "rosy-nails-2" }) })
    )
  })
})

describe("setTenantStatus", () => {
  const tenant = { id: "t1", slug: "rosy", status: "ACTIVE" }
  beforeEach(() => db.fn("Tenant.first").mockResolvedValue(tenant))

  it("refuses to suspend without a reason", async () => {
    await expect(setTenantStatus("t1", "SUSPENDED")).resolves.toEqual({ error: "reasonRequired" })
    await expect(setTenantStatus("t1", "SUSPENDED", "  ")).resolves.toEqual({ error: "reasonRequired" })
    expect(db.fn("Tenant.update")).not.toHaveBeenCalled()
    expect(db.fn("AuditLog.create")).not.toHaveBeenCalled()
  })

  it("suspends with a reason and audits it", async () => {
    await expect(setTenantStatus("t1", "SUSPENDED", "unpaid invoices")).resolves.toEqual({})
    expect(db.fn("Tenant.update")).toHaveBeenCalledWith({ status: "SUSPENDED" })
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        actorId: "staff-1",
        actorKind: "platform",
        action: "platform.tenant.suspended",
        targetId: "t1",
        reason: "unpaid invoices",
      })
    )
  })

  it("reactivates and audits it, reason optional", async () => {
    db.fn("Tenant.first").mockResolvedValue({ ...tenant, status: "SUSPENDED" })
    await expect(setTenantStatus("t1", "ACTIVE")).resolves.toEqual({})
    expect(db.fn("Tenant.update")).toHaveBeenCalledWith({ status: "ACTIVE" })
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({ action: "platform.tenant.reactivated", reason: null })
    )
  })

  it("does nothing for a missing tenant, an unknown status or a no-op", async () => {
    db.fn("Tenant.first").mockResolvedValueOnce(null)
    await expect(setTenantStatus("ghost", "SUSPENDED", "why")).resolves.toEqual({ error: "notFound" })
    await expect(setTenantStatus("t1", "PAST_DUE" as "ACTIVE")).resolves.toEqual({ error: "invalidStatus" })
    await expect(setTenantStatus("t1", "ACTIVE")).resolves.toEqual({})
    expect(db.fn("Tenant.update")).not.toHaveBeenCalled()
    expect(db.fn("AuditLog.create")).not.toHaveBeenCalled()
  })
})
