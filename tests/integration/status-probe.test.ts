import { beforeEach, describe, expect, it, vi } from "vitest"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/headers")>()
  return { ...mod, headers: async () => new Headers() }
})
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))

describe("status probe (13.1)", () => {
  beforeEach(resetDatabase)

  it("probeHealth writes a HealthCheck per kind", async () => {
    const { probeHealth } = await import("@/platform/status/probe")
    await probeHealth()
    const kinds = new Set((await db8.orm.public.HealthCheck.all()).map((r) => r.kind))
    expect(kinds).toEqual(new Set(["database", "queue"]))
    const latest = await db8.orm.public.HealthCheck.orderBy((c) => c.checkedAt.desc()).all()
    expect(latest.length).toBe(2)
    for (const c of latest) expect(c.status).toBe("ok")
  })
})
