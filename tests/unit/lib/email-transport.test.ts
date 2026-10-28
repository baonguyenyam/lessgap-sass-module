import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The contract of the one place email leaves the kit. Whoever replaces Resend
 * with another provider keeps these: false on a refusal instead of an
 * exception, the reply-to passed through, nothing sent without a key.
 */

const send = vi.fn()
vi.mock("resend", () => ({
  Resend: class {
    emails = { send }
  },
}))

// The EmailMessage record (test O3): one row opened per call, settled once.
const outbox = vi.hoisted(() => ({ open: vi.fn(), settle: vi.fn() }))
vi.mock("@/lib/email-outbox", () => ({
  openEmailRecord: (...a: unknown[]) => outbox.open(...a),
  settleEmailRecord: (...a: unknown[]) => outbox.settle(...a),
}))

const original = { ...process.env }

beforeEach(() => {
  send.mockReset()
  outbox.open.mockReset().mockResolvedValue("row-1")
  outbox.settle.mockReset().mockResolvedValue(undefined)
  vi.resetModules()
})

afterEach(() => {
  process.env = { ...original }
})

describe("emailEnabled", () => {
  it("follows the provider key", async () => {
    delete process.env.RESEND_API_KEY
    const { emailEnabled } = await import("@/lib/email-transport")
    expect(emailEnabled()).toBe(false)
    process.env.RESEND_API_KEY = "re_test"
    expect(emailEnabled()).toBe(true)
  })
})

describe("sendEmail", () => {
  it("hands the provider the sender, the recipient and the reply-to", async () => {
    process.env.RESEND_API_KEY = "re_test"
    process.env.EMAIL_FROM = "Acme <hello@acme.test>"
    send.mockResolvedValue({ error: null })
    const { sendEmail } = await import("@/lib/email-transport")

    const accepted = await sendEmail({
      kind: "contact-message",
      to: "owner@acme.test",
      replyTo: "visitor@example.test",
      subject: "Hi",
      html: "<p>Hi</p>",
    })

    expect(accepted).toBe(true)
    expect(send).toHaveBeenCalledWith({
      from: "Acme <hello@acme.test>",
      to: "owner@acme.test",
      replyTo: "visitor@example.test",
      subject: "Hi",
      html: "<p>Hi</p>",
    })
  })

  it("says false when the provider refuses, without throwing", async () => {
    process.env.RESEND_API_KEY = "re_test"
    send.mockResolvedValue({ error: { name: "validation_error", message: "domain not verified" } })
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { sendEmail } = await import("@/lib/email-transport")

    await expect(sendEmail({ kind: "welcome", to: "a@b.test", subject: "s", html: "h" })).resolves.toBe(false)
  })

  it("throws without a key, as before: nothing can be sent", async () => {
    delete process.env.RESEND_API_KEY
    const { sendEmail } = await import("@/lib/email-transport")
    await expect(sendEmail({ kind: "welcome", to: "a@b.test", subject: "s", html: "h" })).rejects.toThrow(
      "RESEND_API_KEY is not set"
    )
    expect(send).not.toHaveBeenCalled()
  })

  it("records one EmailMessage per call, settled with the outcome (O3)", async () => {
    process.env.RESEND_API_KEY = "re_test"
    const { sendEmail } = await import("@/lib/email-transport")

    send.mockResolvedValue({ data: { id: "msg_1" }, error: null })
    await sendEmail({ kind: "welcome", to: "a@b.test", subject: "Hi", html: "h", tenantId: "t1" })
    expect(outbox.open).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "welcome", to: "a@b.test", subject: "Hi", provider: "resend", tenantId: "t1" })
    )
    expect(outbox.settle).toHaveBeenLastCalledWith("row-1", { status: "SENT", providerMessageId: "msg_1" })

    vi.spyOn(console, "error").mockImplementation(() => {})
    send.mockResolvedValue({ error: { name: "validation_error", statusCode: 403, message: "a@b.test is suppressed" } })
    await sendEmail({ kind: "welcome", to: "a@b.test", subject: "Hi", html: "h" })
    expect(outbox.settle).toHaveBeenLastCalledWith("row-1", {
      status: "REFUSED",
      lastError: "validation_error 403: [address] is suppressed",
    })

    expect(outbox.open).toHaveBeenCalledTimes(2)
    expect(outbox.settle).toHaveBeenCalledTimes(2)
  })

  it("still settles the record as FAILED when the send throws, and rethrows", async () => {
    delete process.env.RESEND_API_KEY
    const { sendEmail } = await import("@/lib/email-transport")
    await expect(sendEmail({ kind: "welcome", to: "a@b.test", subject: "s", html: "h" })).rejects.toThrow()
    expect(outbox.open).toHaveBeenCalledWith(expect.objectContaining({ provider: "none" }))
    expect(outbox.settle).toHaveBeenCalledWith("row-1", { status: "FAILED", lastError: "RESEND_API_KEY is not set" })
  })
})

describe("Brevo", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("counts as configured on its own, and wins over Resend", async () => {
    delete process.env.RESEND_API_KEY
    process.env.BREVO_API_KEY = "xkeysib-test"
    process.env.EMAIL_FROM = "Acme <hello@acme.test>"
    process.env.RESEND_API_KEY = "re_test"
    fetchMock.mockResolvedValue(new Response("{}", { status: 201 }))
    const { emailEnabled, sendEmail } = await import("@/lib/email-transport")

    expect(emailEnabled()).toBe(true)
    await sendEmail({ kind: "welcome", to: "a@b.test", subject: "s", html: "h" })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(send).not.toHaveBeenCalled()
  })

  it("sends the sender, the recipient and the reply-to in Brevo's shape", async () => {
    process.env.BREVO_API_KEY = "xkeysib-test"
    process.env.EMAIL_FROM = "Acme <hello@acme.test>"
    fetchMock.mockResolvedValue(new Response("{}", { status: 201 }))
    const { sendEmail } = await import("@/lib/email-transport")

    const accepted = await sendEmail({
      kind: "contact-message",
      to: "owner@acme.test",
      replyTo: "visitor@example.test",
      subject: "Hi",
      html: "<p>Hi</p>",
    })

    expect(accepted).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.brevo.com/v3/smtp/email")
    expect(init.headers["api-key"]).toBe("xkeysib-test")
    expect(JSON.parse(init.body)).toEqual({
      sender: { name: "Acme", email: "hello@acme.test" },
      to: [{ email: "owner@acme.test" }],
      subject: "Hi",
      htmlContent: "<p>Hi</p>",
      replyTo: { email: "visitor@example.test" },
    })
  })

  it("says false when Brevo refuses, without throwing", async () => {
    process.env.BREVO_API_KEY = "xkeysib-test"
    process.env.EMAIL_FROM = "Acme <hello@acme.test>"
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "unauthorized", message: "Key not found" }), { status: 401 })
    )
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const { sendEmail } = await import("@/lib/email-transport")

    await expect(sendEmail({ kind: "welcome", to: "a@b.test", subject: "s", html: "h" })).resolves.toBe(false)
    expect(log.mock.calls[0][0]).toBe("[email] welcome rejected by Brevo")
  })
})

describe("parseSender", () => {
  it("splits a name and an address", async () => {
    const { parseSender } = await import("@/lib/email-transport")
    expect(parseSender("less[GAP] Solutions <hello@lessgap.com>")).toEqual({
      name: "less[GAP] Solutions",
      email: "hello@lessgap.com",
    })
  })

  it("accepts a quoted name and a bare address", async () => {
    const { parseSender } = await import("@/lib/email-transport")
    expect(parseSender('"Acme" <a@b.test>')).toEqual({ name: "Acme", email: "a@b.test" })
    expect(parseSender("a@b.test")).toEqual({ email: "a@b.test" })
  })
})
