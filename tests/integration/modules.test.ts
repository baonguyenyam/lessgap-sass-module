import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { db8 } from "@/lib/db8"
import { systemContext } from "@/platform/tenancy/context"
import { disableModule, enableModule, isModuleActive, requireModuleRoute } from "@/platform/modules/runtime"
import { createTenant } from "@tests/factories"
import { resetDatabase } from "@tests/helpers/db"

// Outside Next, "use cache" helpers would throw; the read itself is what is under test.
vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {} }))

// A fixture registry: no real module ships yet (phase 4).
const registry = { catalog: {}, booking: { dependsOn: ["catalog"] } }

async function setup() {
  const { tenant } = await createTenant()
  for (const key of Object.keys(registry)) {
    await db8.orm.public.PlatformSwitch.create({ key: `module.${key}`, value: true as never })
  }
  return systemContext(tenant.id, "test")
}

describe("module enablement (task 1.6)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("enables and disables idempotently, and reports the first enable once", async () => {
    const ctx = await setup()
    expect(await enableModule(ctx, "catalog", registry)).toEqual({ firstTime: true })
    expect(await enableModule(ctx, "catalog", registry)).toEqual({ firstTime: false })
    expect(await isModuleActive(ctx, "catalog", registry)).toBe(true)

    await disableModule(ctx, "catalog", registry)
    await disableModule(ctx, "catalog", registry)
    expect(await isModuleActive(ctx, "catalog", registry)).toBe(false)
    expect(await enableModule(ctx, "catalog", registry)).toEqual({ firstTime: false })
    expect(await db8.orm.public.TenantModule.where({ tenantId: ctx.tenantId }).all()).toHaveLength(1)
  })

  it("refuses to enable before a dependency, and to disable a module others depend on", async () => {
    const ctx = await setup()
    await expect(enableModule(ctx, "booking", registry)).rejects.toMatchObject({ code: "conflict" })
    await enableModule(ctx, "catalog", registry)
    await enableModule(ctx, "booking", registry)
    await expect(disableModule(ctx, "catalog", registry)).rejects.toMatchObject({
      code: "conflict",
      field: "dependants:booking",
    })
    expect(await isModuleActive(ctx, "booking", registry)).toBe(true)
  })

  it("answers 404 on a disabled module's routes", async () => {
    const ctx = await setup()
    await expect(requireModuleRoute(ctx, "catalog", registry)).rejects.toThrow(
      /NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/
    )
    await enableModule(ctx, "catalog", registry)
    await expect(requireModuleRoute(ctx, "catalog", registry)).resolves.toBeUndefined()
  })

  it("keeps one tenant's modules out of another's", async () => {
    const a = await setup()
    const { tenant } = await createTenant()
    const b = systemContext(tenant.id, "test")
    await enableModule(a, "catalog", registry)
    expect(await isModuleActive(b, "catalog", registry)).toBe(false)
  })
})
