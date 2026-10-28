import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const sendNewsletterConfirmEmail = vi.fn()

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/lib/email", () => ({ sendNewsletterConfirmEmail }))
vi.mock("@/config/site", () => ({ siteConfig: { url: "https://example.com" } }))
vi.mock("@/platform/tenancy/require-member", () => ({
  requireTenantContext: async () => ({ tenantId: "t1", user: { id: "u1" }, member: { role: "owner" } }),
}))
// The module gate is covered by the lifecycle tests; these tests exercise the
// action's own logic on an enabled module.
vi.mock("@/platform/modules/runtime", () => ({ requireModule: vi.fn() }))
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { addTenantSubscriber, unsubscribeTenantSubscribers } = await import("@/app/actions/newsletter")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

beforeEach(() => {
  db.reset()
  sendNewsletterConfirmEmail.mockReset().mockResolvedValue(undefined)
})

describe("addTenantSubscriber", () => {
  it("rejects bad and already listed addresses", async () => {
    await expect(addTenantSubscriber({ email: "nope" })).resolves.toEqual({ error: "invalidEmail" })
    db.fn("NewsletterSubscriber.first").mockResolvedValue({ email: "a@example.com", unsubscribedAt: null })
    await expect(addTenantSubscriber({ email: "a@example.com" })).resolves.toEqual({ error: "exists" })
    expect(db.call("NewsletterSubscriber.create")).toBeUndefined()
  })

  it("adds the address to this tenant's list and sends the confirmation", async () => {
    db.fn("NewsletterSubscriber.first").mockResolvedValue(null)
    await expect(addTenantSubscriber({ email: "New@Example.com" })).resolves.toEqual({})
    const create = db.call("NewsletterSubscriber.create")
    expect(create?.chain[0]).toEqual(["where", [{ tenantId: "t1" }]])
    expect(create?.args[0]).toMatchObject({ tenantId: "t1", email: "new@example.com", source: "manual" })
    expect(sendNewsletterConfirmEmail).toHaveBeenCalledWith(
      "new@example.com",
      expect.stringContaining("/newsletter/confirm?token=")
    )
  })
})

describe("unsubscribeTenantSubscribers", () => {
  it("only touches this tenant's rows", async () => {
    db.fn("NewsletterSubscriber.updateAndCount").mockResolvedValue(2)
    await expect(unsubscribeTenantSubscribers(["s1", "s2", "s1"])).resolves.toEqual({ changed: 2 })
    expect(db.call("NewsletterSubscriber.updateAndCount")?.chain[0]).toEqual(["where", [{ tenantId: "t1" }]])
  })
})
