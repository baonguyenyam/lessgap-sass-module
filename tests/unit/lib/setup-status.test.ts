import { afterEach, describe, expect, it, vi } from "vitest"

/**
 * The page this feeds is the first thing a new clone sees, so the two things
 * worth pinning are that it names the right step and that it never speaks in
 * production.
 */
const count = vi.fn()
vi.mock("@/lib/db8", () => ({ db8: { orm: { public: { Plan: { aggregate: () => count() } } } } }))

const { pendingSetup, stepFromError } = await import("@/lib/setup-status")

afterEach(() => {
  vi.unstubAllEnvs()
  count.mockReset()
})

describe("stepFromError", () => {
  it("reads a connection failure as the address being wrong", () => {
    // What Prisma 8 throws for a host that does not answer and for a URL that is not one.
    expect(
      stepFromError({ code: "CONTRACT.MARKER_READ_FAILED", cause: { name: "SqlConnectionError" } })
    ).toBe("database-unreachable")
    expect(stepFromError({ code: "RUNTIME.BINDING_INVALID" })).toBe("database-unreachable")
  })

  it("reads anything else as migrations still to apply", () => {
    expect(stepFromError({ code: "42P01" })).toBe("migrations")
    expect(stepFromError(new Error('relation "Plan" does not exist'))).toBe("migrations")
    expect(stepFromError(null)).toBe("migrations")
  })
})

describe("pendingSetup", () => {
  it("says nothing in production, whatever the database does", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("DATABASE_URL", "")
    expect(await pendingSetup()).toBeNull()
    expect(count).not.toHaveBeenCalled()
  })

  it("asks for the connection string when there is none", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DATABASE_URL", "")
    expect(await pendingSetup()).toBe("database-url")
    expect(count).not.toHaveBeenCalled()
  })

  it("says nothing once a query goes through", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@host/db")
    count.mockResolvedValue(6)
    expect(await pendingSetup()).toBeNull()
  })

  it("names the step the failed query points at", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@host/db")
    count.mockRejectedValue({ code: "42P01" })
    expect(await pendingSetup()).toBe("migrations")
    count.mockRejectedValue({ code: "CONTRACT.MARKER_READ_FAILED", cause: { name: "SqlConnectionError" } })
    expect(await pendingSetup()).toBe("database-unreachable")
  })
})
