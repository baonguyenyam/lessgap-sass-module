import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const session = vi.fn()
const removeContact = vi.fn()

vi.mock("@/auth", () => ({ auth: { api: { getSession: () => session() } } }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/email", () => ({ removeNewsletterContact: (email: string) => removeContact(email) }))
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { unsubscribeSubscribers } = await import("@/app/actions/newsletter-admin")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

beforeEach(() => {
  db.reset()
  removeContact.mockReset().mockResolvedValue(undefined)
  session.mockResolvedValue({ user: { id: "r1", role: "ROOT" } })
})

describe("unsubscribeSubscribers", () => {
  it("is ROOT only", async () => {
    session.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } })
    await expect(unsubscribeSubscribers(["s1"])).rejects.toThrow("Unauthorized")
  })

  it("unsubscribes the active ones and removes them from the audience", async () => {
    db.fn("NewsletterSubscriber.all").mockResolvedValue([{ id: "s1", email: "a@example.com" }])
    db.fn("NewsletterSubscriber.updateAndCount").mockResolvedValue(1)
    await expect(unsubscribeSubscribers(["s1", "s2", "s1"])).resolves.toEqual({ changed: 1 })
    expect(removeContact).toHaveBeenCalledWith("a@example.com")
  })

  it("keeps the unsubscribe when the audience cannot be reached", async () => {
    db.fn("NewsletterSubscriber.all").mockResolvedValue([{ id: "s1", email: "a@example.com" }])
    db.fn("NewsletterSubscriber.updateAndCount").mockResolvedValue(1)
    removeContact.mockRejectedValue(new Error("network"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    await expect(unsubscribeSubscribers(["s1"])).resolves.toEqual({ changed: 1 })
  })

  it("does nothing for an empty selection or rows already unsubscribed", async () => {
    await expect(unsubscribeSubscribers([])).resolves.toEqual({ changed: 0 })
    db.fn("NewsletterSubscriber.all").mockResolvedValue([])
    await expect(unsubscribeSubscribers(["s1"])).resolves.toEqual({ changed: 0 })
    expect(db.call("NewsletterSubscriber.updateAndCount")).toBeUndefined()
  })
})
