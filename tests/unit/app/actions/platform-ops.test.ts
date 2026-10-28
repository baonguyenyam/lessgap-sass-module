import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const staff = { user: { id: "staff-1" }, platformRole: "ADMIN" }
const retryJob = vi.fn(async () => true)
const runJobNow = vi.fn(async () => true)
const sendEmail = vi.fn(async () => true)

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/platform/staff", () => ({ requirePlatformRole: async () => staff }))
vi.mock("@/platform/jobs/runner", () => ({ retryJob, runJobNow }))
vi.mock("@/lib/email-transport", () => ({ sendEmail }))
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { retryJobAction, runJobNowAction, resendEmail, resolveError } = await import("@/app/actions/platform-ops")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

beforeEach(() => {
  db.reset()
  vi.clearAllMocks()
})

describe("retryJobAction / runJobNowAction", () => {
  it("re-scopes through staff, calls the helper and audits the row's tenant", async () => {
    db.fn("Job.first").mockResolvedValue({ tenantId: "t-1" })
    await expect(retryJobAction("j-1")).resolves.toEqual({})
    await expect(runJobNowAction("j-2")).resolves.toEqual({})
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({ action: "platform.job.retried", tenantId: "t-1" })
    )
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({ action: "platform.job.run_now", tenantId: "t-1" })
    )
  })

  it("refuses a missing job and one the helper does not move", async () => {
    db.fn("Job.first").mockResolvedValue(null)
    await expect(retryJobAction("j-1")).resolves.toEqual({ error: "notFound" })
    db.fn("Job.first").mockResolvedValue({ tenantId: null })
    retryJob.mockResolvedValueOnce(false)
    runJobNow.mockResolvedValueOnce(false)
    await expect(retryJobAction("j-1")).resolves.toEqual({ error: "notFound" })
    await expect(runJobNowAction("j-2")).resolves.toEqual({ error: "notFound" })
    expect(db.fn("AuditLog.create")).not.toHaveBeenCalled()
  })
})

describe("resendEmail", () => {
  it("sends the stored body through the normal transport and audits", async () => {
    db.fn("EmailMessage.first").mockResolvedValue({
      id: "m-1",
      kind: "magic-link",
      toAddress: "a@example.com",
      subject: "Sign in",
      tenantId: "t-1",
      payload: { html: "<p>link</p>" },
    })
    await expect(resendEmail("m-1")).resolves.toEqual({})
    expect(sendEmail).toHaveBeenCalledWith({
      kind: "magic-link",
      to: "a@example.com",
      subject: "Sign in",
      html: "<p>link</p>",
      tenantId: "t-1",
    })
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({ action: "platform.email.resent", tenantId: "t-1" })
    )
  })

  it("refuses a missing row and a row with no stored body", async () => {
    db.fn("EmailMessage.first").mockResolvedValue(null)
    await expect(resendEmail("m-1")).resolves.toEqual({ error: "notFound" })
    db.fn("EmailMessage.first").mockResolvedValue({ id: "m-1", payload: null })
    await expect(resendEmail("m-1")).resolves.toEqual({ error: "noPayload" })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("reports a failed resend attempt", async () => {
    db.fn("EmailMessage.first").mockResolvedValue({ id: "m-1", payload: { html: "x" } })
    sendEmail.mockResolvedValueOnce(false)
    await expect(resendEmail("m-1")).resolves.toEqual({ error: "sendFailed" })
  })
})

describe("resolveError", () => {
  it("sets resolvedAt on the digest and audits it", async () => {
    db.fn("ErrorReport.first").mockResolvedValue({ tenantId: "t-2" })
    await expect(resolveError("e-1")).resolves.toEqual({})
    expect(db.fn("ErrorReport.update")).toHaveBeenCalledWith({ resolvedAt: expect.any(String) })
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({ action: "platform.error.resolved", tenantId: "t-2" })
    )
  })

  it("refuses a missing digest", async () => {
    db.fn("ErrorReport.first").mockResolvedValue(null)
    await expect(resolveError("e-1")).resolves.toEqual({ error: "notFound" })
    expect(db.fn("ErrorReport.update")).not.toHaveBeenCalled()
  })
})
