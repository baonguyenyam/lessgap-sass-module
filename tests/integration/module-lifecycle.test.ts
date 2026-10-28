import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import type { TenantContext } from "@/platform/tenancy/context"
import { disableModule, enableModule, isModuleActive, requireModule } from "@/platform/modules/runtime"
import {
  cancelModulePurge,
  describeModuleData,
  pendingPurge,
  requestModuleExport,
  runModuleExport,
  runModulePurge,
  scheduleModulePurge,
} from "@/platform/modules/lifecycle"
import { AppError } from "@/platform/errors"
import { toTs } from "@/lib/timestamps"
import { resetDatabase } from "@tests/helpers/db"

/**
 * The module lifecycle catalogue (task 2.10, spec/15): L1–L10, all on the
 * newsletter module — the one real module the registry carries today.
 */
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))
vi.mock("@/lib/email", async (importOriginal) =>
  Object.fromEntries(Object.keys(await importOriginal<object>()).map((name) => [name, vi.fn(async () => true)]))
)
vi.mock("@/platform/jobs/runner", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  enqueueJob: vi.fn(async () => ({})),
}))

function memberCtx(tenantId: string, userId = "u1"): TenantContext {
  return { tenantId, actor: { kind: "member", userId, role: "owner" } }
}

async function provision(subscribers = 0) {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `mod-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "M",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "ModCo", slug: `mod-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  await db8.orm.public.PlatformSwitch.upsert({
    conflictOn: { key: "module.newsletter" },
    create: { key: "module.newsletter", value: true, updatedById: "test" },
    update: { value: true },
  })
  for (let i = 0; i < subscribers; i++) {
    await db8.orm.public.NewsletterSubscriber.create({
      tenantId: tenant.id,
      email: `sub${i}-${Date.now()}@example.test`,
      confirmToken: `ct-${Date.now()}-${i}`,
      unsubscribeToken: `ut-${Date.now()}-${i}`,
      source: "manual",
    })
  }
  const ctx = memberCtx(tenant.id, user.id)
  return { user, tenant, ctx }
}

describe("module lifecycle L1–L10", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("L1: enable is idempotent — the second enable is a no-op", async () => {
    const { ctx, tenant } = await provision()
    const first = await enableModule(ctx, "newsletter")
    expect(first.firstTime).toBe(true)
    const second = await enableModule(ctx, "newsletter")
    expect(second.firstTime).toBe(false)
    const rows = await db8.orm.public.TenantModule.where({ tenantId: tenant.id }).all()
    expect(rows).toHaveLength(1)
    expect(await isModuleActive(ctx, "newsletter")).toBe(true)
  })

  it("L2: disable removes access but keeps the module's data", async () => {
    const { ctx, tenant } = await provision(3)
    await enableModule(ctx, "newsletter")
    await disableModule(ctx, "newsletter")
    expect(await isModuleActive(ctx, "newsletter")).toBe(false)
    await expect(requireModule(ctx, "newsletter")).rejects.toBeInstanceOf(AppError)
    expect(await db8.orm.public.NewsletterSubscriber.where({ tenantId: tenant.id }).all()).toHaveLength(3)
  })

  it("L3: enable refuses when a dependency is missing, disable refuses while a dependant is on", async () => {
    const { ctx } = await provision()
    const { moduleRegistry } = await import("@/modules/registry")
    const fake = {
      ...moduleRegistry,
      child: { key: "child", name: "Child", version: "1.0.0", stage: "stable", dependsOn: ["newsletter"] },
    } as never
    await expect(enableModule(ctx, "child", fake)).rejects.toBeInstanceOf(AppError)
    await enableModule(ctx, "newsletter")
    await enableModule(ctx, "child", fake)
    await expect(disableModule(ctx, "newsletter", fake)).rejects.toBeInstanceOf(AppError)
  })

  it("L4: a purge refuses while the module is still enabled", async () => {
    const { ctx } = await provision()
    await enableModule(ctx, "newsletter")
    await expect(scheduleModulePurge(ctx, "newsletter", "Newsletter")).rejects.toBeInstanceOf(AppError)
  })

  it("L5: scheduling a purge needs the typed name and records counts + audit", async () => {
    const { ctx, tenant } = await provision(4)
    await enableModule(ctx, "newsletter")
    await disableModule(ctx, "newsletter")
    const bad = await scheduleModulePurge(ctx, "newsletter", "wrong name")
    expect(bad.error).toBe("name_mismatch")
    expect(await pendingPurge(tenant.id, "newsletter")).toBeNull()

    await scheduleModulePurge(ctx, "newsletter", "Newsletter")
    const purge = await pendingPurge(tenant.id, "newsletter")
    expect(purge).not.toBeNull()
    expect((purge!.counts as Record<string, number>)["newsletter.subscribers"]).toBe(4)
    expect(new Date(purge!.runAfter).getTime()).toBeGreaterThan(Date.now() + 6 * 86400000)
    const audit = await db8.orm.public.AuditLog.where({ action: "module.purge.scheduled", tenantId: tenant.id }).first()
    expect(audit).not.toBeNull()
  })

  it("L6: a scheduled purge cancels inside its grace period", async () => {
    const { ctx, tenant } = await provision(2)
    await enableModule(ctx, "newsletter")
    await disableModule(ctx, "newsletter")
    await scheduleModulePurge(ctx, "newsletter", "Newsletter")
    await cancelModulePurge(ctx, "newsletter")
    expect(await pendingPurge(tenant.id, "newsletter")).toBeNull()
    // And the cancelled row is done history, not a blocker for the next schedule.
    await scheduleModulePurge(ctx, "newsletter", "Newsletter")
    expect(await pendingPurge(tenant.id, "newsletter")).not.toBeNull()
  })

  it("L7: the purge only runs after runAfter and only deletes this tenant's rows", async () => {
    const { ctx, tenant } = await provision(5)
    const other = await provision(3)
    await enableModule(ctx, "newsletter")
    await disableModule(ctx, "newsletter")
    await scheduleModulePurge(ctx, "newsletter", "Newsletter")
    const purge = (await pendingPurge(tenant.id, "newsletter"))!

    // Before runAfter: the job is a no-op.
    await runModulePurge(purge.id)
    expect(await db8.orm.public.NewsletterSubscriber.where({ tenantId: tenant.id }).all()).toHaveLength(5)

    // After runAfter: this tenant's rows are gone; the other tenant keeps its own.
    await db8.orm.public.ModulePurge.where({ id: purge.id }).update({ runAfter: toTs(new Date(Date.now() - 1000)) })
    await runModulePurge(purge.id)
    expect(await db8.orm.public.NewsletterSubscriber.where({ tenantId: tenant.id }).all()).toHaveLength(0)
    expect(await db8.orm.public.NewsletterSubscriber.where({ tenantId: other.tenant.id }).all()).toHaveLength(3)
    expect((await db8.orm.public.ModulePurge.where({ id: purge.id }).first())?.status).toBe("done")
  })

  it("L8: an interrupted purge re-runs cleanly — onPurge is idempotent", async () => {
    const { ctx, tenant } = await provision(3)
    await enableModule(ctx, "newsletter")
    await disableModule(ctx, "newsletter")
    await scheduleModulePurge(ctx, "newsletter", "Newsletter")
    const purge = (await pendingPurge(tenant.id, "newsletter"))!
    await db8.orm.public.ModulePurge.where({ id: purge.id }).update({ runAfter: toTs(new Date(Date.now() - 1000)) })
    // Run twice — the second finds nothing left and still finishes.
    await runModulePurge(purge.id)
    await runModulePurge(purge.id)
    expect(await db8.orm.public.NewsletterSubscriber.where({ tenantId: tenant.id }).all()).toHaveLength(0)
  })

  it("L9: an export is this tenant's rows and expires after 7 days", async () => {
    const { ctx, tenant } = await provision(2)
    const other = await provision(1)
    const { exportId } = await requestModuleExport(ctx, "newsletter")
    await runModuleExport(exportId)
    const row = await db8.orm.public.ModuleExport.where({ id: exportId }).first()
    expect(row).not.toBeNull()
    const files = row!.files as Record<string, string>
    const data = JSON.parse(files["newsletter.subscribers.json"]) as Array<{ tenantId: string }>
    expect(data).toHaveLength(2)
    expect(data.every((d) => d.tenantId === tenant.id)).toBe(true)
    expect(data.some((d) => d.tenantId === other.tenant.id)).toBe(false)
    expect(new Date(row!.expiresAt).getTime()).toBeGreaterThan(Date.now() + 6 * 86400000)
    // And describeData counts only this tenant's rows.
    expect((await describeModuleData(ctx, "newsletter"))["newsletter.subscribers"]).toBe(2)
  })

  it("L10: every registered module implements the lifecycle hooks it declares", async () => {
    const { moduleRegistry } = await import("@/modules/registry")
    for (const [key, m] of Object.entries(moduleRegistry)) {
      expect(m.key).toBe(key)
      const lifecycle = (m as { lifecycle?: Record<string, unknown> }).lifecycle ?? {}
      for (const hook of ["describeData", "onExport", "onPurge"]) {
        expect(typeof lifecycle[hook], `${key}.${hook}`).toBe("function")
      }
    }
  })
})
