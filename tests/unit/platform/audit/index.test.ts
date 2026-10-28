import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const logError = vi.fn<(event: string, fields: unknown) => Promise<void>>(async () => {})

vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())
vi.mock("@/platform/log", () => ({ log: { info: vi.fn(), error: logError } }))

const { audit, memberAuditContext, platformAuditContext } = await import("@/platform/audit")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

beforeEach(() => {
  db.reset()
  logError.mockClear()
})

describe("audit (task 1.9)", () => {
  it("writes exactly one row with actor, tenant, action, target and reason", async () => {
    await audit(memberAuditContext({ tenantId: "t1", user: { id: "u1" } }), {
      action: "tenancy.member.role_changed",
      targetType: "member",
      targetId: "m2",
      data: { from: "staff", to: "manager" },
      reason: "promotion",
    })
    expect(db.fn("AuditLog.create")).toHaveBeenCalledTimes(1)
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith({
      tenantId: "t1",
      actorId: "u1",
      actorKind: "member",
      action: "tenancy.member.role_changed",
      targetType: "member",
      targetId: "m2",
      data: { from: "staff", to: "manager" },
      reason: "promotion",
    })
  })

  it("records a platform action without a tenant", async () => {
    await audit(platformAuditContext("root-1"), {
      action: "platform.switch_as.started",
      targetType: "user",
      targetId: "u9",
    })
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: null, actorId: "root-1", actorKind: "platform" })
    )
  })

  it("takes a TenantContext unchanged: a system actor is recorded by its job name", async () => {
    await audit(
      { tenantId: "t1", actor: { kind: "system", job: "tenancy.purge" } },
      { action: "tenancy.tenant.deleted" }
    )
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: "tenancy.purge", actorKind: "system" })
    )
  })

  it("nulls the fields the event leaves out", async () => {
    await audit(memberAuditContext({ tenantId: "t1", user: { id: "u1" } }), { action: "tenancy.role.deleted" })
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: null, targetId: null, data: null, reason: null })
    )
  })

  it("never lets a failed write break the action it records", async () => {
    db.fn("AuditLog.create").mockRejectedValue(new Error("db down"))
    await expect(
      audit(memberAuditContext({ tenantId: "t1", user: { id: "u1" } }), { action: "tenancy.member.removed" })
    ).resolves.toBeUndefined()
    expect(logError).toHaveBeenCalledWith(
      "audit.write_failed",
      expect.objectContaining({ action: "tenancy.member.removed" })
    )
  })
})
