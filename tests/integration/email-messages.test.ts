import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { db8 } from "@/lib/db8"
import { toTs } from "@/lib/timestamps"
import { JOBS } from "@/platform/jobs/registry"
import { resetDatabase } from "@tests/helpers/db"

// The provider is Brevo with a stubbed network: no email leaves the test.
const fetchMock = vi.fn()

describe("EmailMessage (O3)", () => {
  beforeEach(async () => {
    await resetDatabase()
    vi.stubEnv("BREVO_API_KEY", "xkeysib-test")
    vi.stubEnv("EMAIL_FROM", "App <hello@app.test>")
    vi.stubGlobal("fetch", fetchMock)
    vi.spyOn(console, "error").mockImplementation(() => {})
    fetchMock.mockReset()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })
  afterAll(async () => db8.close())

  it("leaves exactly one REFUSED row with a masked error when the key is refused", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "unauthorized", message: "Key not found for owner@example.com" }), {
        status: 401,
      })
    )
    const { sendEmail } = await import("@/lib/email-transport")
    await expect(
      sendEmail({ kind: "magic-link", to: "member@example.test", subject: "Sign in", html: "h" })
    ).resolves.toBe(false)

    const rows = await db8.orm.public.EmailMessage.all()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      kind: "magic-link",
      toAddress: "member@example.test",
      provider: "brevo",
      status: "REFUSED",
      lastError: "unauthorized 401: Key not found for [address]",
      sentAt: null,
    })
  })

  it("records SENT with the provider's message id", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ messageId: "<abc@smtp-relay>" }), { status: 201 }))
    const { sendEmail } = await import("@/lib/email-transport")
    await expect(sendEmail({ kind: "welcome", to: "member@example.test", subject: "Hi", html: "h" })).resolves.toBe(
      true
    )

    const rows = await db8.orm.public.EmailMessage.all()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ status: "SENT", providerMessageId: "<abc@smtp-relay>" })
    expect(rows[0].sentAt).not.toBeNull()
  })

  it("records FAILED when the network throws, and the caller still sees the error", async () => {
    fetchMock.mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.brevo.com"))
    const { sendEmail } = await import("@/lib/email-transport")
    await expect(sendEmail({ kind: "welcome", to: "member@example.test", subject: "Hi", html: "h" })).rejects.toThrow()

    const rows = await db8.orm.public.EmailMessage.all()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ status: "FAILED", lastError: "getaddrinfo ENOTFOUND api.brevo.com" })
  })

  it("prunes records older than a year with the scheduled job", async () => {
    const old = toTs(new Date(Date.now() - 400 * 24 * 60 * 60 * 1000))
    await db8.orm.public.EmailMessage.create({
      kind: "old",
      toAddress: "a@b.test",
      subject: "s",
      provider: "brevo",
      createdAt: old,
    })
    await db8.orm.public.EmailMessage.create({ kind: "new", toAddress: "a@b.test", subject: "s", provider: "brevo" })
    await JOBS["platform.email_messages.prune"].handler({}, { jobId: "j", attempt: 1, tenantId: null, requestId: null })

    const kinds = (await db8.orm.public.EmailMessage.all()).map((row) => row.kind)
    expect(kinds).toEqual(["new"])
  })
})
