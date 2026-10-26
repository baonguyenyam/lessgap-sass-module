import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Db8Mock } from "@/test/db8-mock"
import { toDate } from "@/lib/timestamps"

/**
 * The newsletter endpoint answers the same neutral 200 whatever happens, so
 * that nobody can use it to learn who is on the list. 2.3.2 made a refused
 * confirmation visible in the logs; these tests pin that it stayed invisible
 * to the caller, which is the half that matters for privacy.
 */

const sendNewsletterConfirmEmail = vi.fn()
const isNewsletterContactUnsubscribed = vi.fn()

vi.mock("@/lib/db8", async () => (await import("@/test/db8-mock")).createDb8Mock())
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => true,
  rateLimitKeyFromIp: async () => "newsletter:test",
}))
vi.mock("@/lib/email", () => ({ sendNewsletterConfirmEmail, isNewsletterContactUnsubscribed }))

const { POST } = await import("./route")
const db = (await import("@/lib/db8")) as unknown as Db8Mock
const subscribers = {
  findUnique: db.fn("NewsletterSubscriber.first"),
  create: db.fn("NewsletterSubscriber.create"),
  update: db.fn("NewsletterSubscriber.update"),
}

const signup = (email: string) =>
  new Request("http://localhost/api/newsletter", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, source: "pricing-card" }),
  })

/** Status and body together: the caller sees nothing else. */
async function answer(response: Response) {
  return { status: response.status, body: await response.json() }
}

beforeEach(() => {
  vi.clearAllMocks()
  subscribers.create.mockResolvedValue({ confirmToken: "t" })
  subscribers.update.mockResolvedValue({ confirmToken: "t" })
  isNewsletterContactUnsubscribed.mockResolvedValue(false)
})

describe("POST /api/newsletter: the answer never depends on the outcome", () => {
  it("answers a new address whose confirmation Resend refused exactly like an accepted one", async () => {
    subscribers.findUnique.mockResolvedValue(null)

    sendNewsletterConfirmEmail.mockResolvedValue(true)
    const accepted = await answer(await POST(signup("new@example.com")))

    sendNewsletterConfirmEmail.mockResolvedValue(false)
    const refused = await answer(await POST(signup("new@example.com")))

    expect(refused).toEqual(accepted)
    expect(refused).toEqual({ status: 200, body: { ok: true } })
  })

  it("answers an address already confirmed exactly like a new one whose email was refused", async () => {
    subscribers.findUnique.mockResolvedValue({
      confirmedAt: "2026-10-01 00:00:00.000",
      unsubscribedAt: null,
    })
    const known = await answer(await POST(signup("known@example.com")))

    subscribers.findUnique.mockResolvedValue(null)
    sendNewsletterConfirmEmail.mockResolvedValue(false)
    const unknown = await answer(await POST(signup("unknown@example.com")))

    expect(known).toEqual(unknown)
    // The known address gets no email at all: there is nothing to confirm.
    expect(sendNewsletterConfirmEmail).toHaveBeenCalledOnce()
  })
})

/**
 * The unsubscribe link of a Broadcast is Resend's: it unsubscribes there and
 * leaves the database saying confirmed and active. Before 2.3.6 that person
 * could never sign up again, because the endpoint saw a confirmed address and,
 * on purpose, sent nothing.
 */
describe("POST /api/newsletter: unsubscribed through a Broadcast, signing up again", () => {
  const confirmed = { confirmedAt: "2026-10-01 00:00:00.000", unsubscribedAt: null }

  it("records the unsubscribe and sends a new confirmation", async () => {
    subscribers.findUnique.mockResolvedValue(confirmed)
    isNewsletterContactUnsubscribed.mockResolvedValue(true)

    await POST(signup("left@example.com"))

    const [data] = subscribers.update.mock.calls[0] as [{ unsubscribedAt: string }]
    expect(toDate(data.unsubscribedAt).getTime()).not.toBeNaN()
    expect(sendNewsletterConfirmEmail).toHaveBeenCalledOnce()
  })

  it("still sends nothing to an address active on both sides", async () => {
    subscribers.findUnique.mockResolvedValue(confirmed)

    await POST(signup("still-here@example.com"))

    expect(subscribers.update).not.toHaveBeenCalled()
    expect(sendNewsletterConfirmEmail).not.toHaveBeenCalled()
  })

  it("answers the same neutral 200", async () => {
    subscribers.findUnique.mockResolvedValue(confirmed)
    isNewsletterContactUnsubscribed.mockResolvedValue(true)
    expect(await answer(await POST(signup("left@example.com")))).toEqual({ status: 200, body: { ok: true } })
  })

  it("answers the same neutral 200 when Resend cannot be asked", async () => {
    subscribers.findUnique.mockResolvedValue(confirmed)
    isNewsletterContactUnsubscribed.mockRejectedValue(new Error("network"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect(await answer(await POST(signup("left@example.com")))).toEqual({ status: 200, body: { ok: true } })
  })
})
