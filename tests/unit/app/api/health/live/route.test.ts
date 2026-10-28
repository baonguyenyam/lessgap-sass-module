import { describe, expect, it, vi } from "vitest"

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}))

const { GET } = await import("@/app/api/health/live/route")

describe("GET /api/health/live", () => {
  it("answers ok without touching the database, never cached", async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: "ok" })
    expect(response.headers.get("cache-control")).toBe("no-store")
  })
})
