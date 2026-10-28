import { notFound } from "next/navigation"
import { moduleRegistry } from "@/modules/registry"
import { nowTs } from "@/lib/timestamps"
import { AppError } from "@/platform/errors"
import { getPlatformSwitches } from "@/platform/settings/store"
import type { TenantContext } from "@/platform/tenancy/context"
import { tenantDb } from "@/platform/tenancy/tenant-db"

/**
 * Whether a module is active for a tenant (spec/15-module-system.md,
 * "Lifecycle"; phase 1, task 1.6): registered, available (platform switch
 * `module.<key>` on), enabled by the tenant, and every `dependsOn` active.
 * Entitlements join in phase 2; until then every tenant is entitled.
 */

export type ModuleRegistry = Readonly<Record<string, { readonly dependsOn?: readonly string[] }>>

/** The rule itself, on plain inputs. Cycle-safe: a module in a cycle is never active. */
export function moduleActive(
  key: string,
  input: { registry: ModuleRegistry; switches: Readonly<Record<string, unknown>>; enabled: ReadonlySet<string> },
  visiting: ReadonlySet<string> = new Set()
): boolean {
  if (visiting.has(key)) return false
  const manifest = input.registry[key]
  if (!manifest || input.switches[`module.${key}`] !== true || !input.enabled.has(key)) return false
  const next = new Set(visiting).add(key)
  return (manifest.dependsOn ?? []).every((dependency) => moduleActive(dependency, input, next))
}

/** The enabled modules that depend on `key`, which keep it from being disabled. */
export function dependantsOf(key: string, registry: ModuleRegistry, enabled: ReadonlySet<string>): string[] {
  return Object.entries(registry)
    .filter(([other, manifest]) => other !== key && enabled.has(other) && manifest.dependsOn?.includes(key))
    .map(([other]) => other)
}

async function enabledModules(ctx: TenantContext): Promise<Set<string>> {
  const rows = await tenantDb(ctx, (db) => db.TenantModule.where({ enabled: true }).select("moduleKey").all())
  return new Set(rows.map((row) => row.moduleKey))
}

export async function isModuleActive(
  ctx: TenantContext,
  key: string,
  registry: ModuleRegistry = moduleRegistry
): Promise<boolean> {
  return moduleActive(key, { registry, switches: await getPlatformSwitches(), enabled: await enabledModules(ctx) })
}

/** For actions: a typed `module_inactive`. Routes call `notFound()` on false instead. */
export async function requireModule(
  ctx: TenantContext,
  key: string,
  registry: ModuleRegistry = moduleRegistry
): Promise<void> {
  if (!(await isModuleActive(ctx, key, registry))) throw new AppError("module_inactive")
}

/** For pages and route handlers: a disabled module's routes answer 404. */
export async function requireModuleRoute(
  ctx: TenantContext,
  key: string,
  registry: ModuleRegistry = moduleRegistry
): Promise<void> {
  if (!(await isModuleActive(ctx, key, registry))) notFound()
}

/**
 * Turns a module on for the tenant. Idempotent: enabling an enabled module
 * changes nothing. Refused for an unknown module and while a module it
 * depends on is off. Returns whether this is the first time (run `onEnable`).
 */
export async function enableModule(
  ctx: TenantContext,
  key: string,
  registry: ModuleRegistry = moduleRegistry
): Promise<{ firstTime: boolean }> {
  const manifest = registry[key]
  if (!manifest) throw new AppError("not_found")
  const enabled = await enabledModules(ctx)
  if ((manifest.dependsOn ?? []).some((dependency) => !enabled.has(dependency))) {
    throw new AppError("conflict", { field: "dependsOn" })
  }
  return tenantDb(ctx, async (db) => {
    const row = await db.TenantModule.where({ moduleKey: key }).first()
    if (row?.enabled) return { firstTime: false }
    const now = nowTs()
    if (!row) {
      await db.TenantModule.create({ moduleKey: key, enabled: true, enabledAt: now, firstEnabledAt: now } as never)
      return { firstTime: true }
    }
    await db.TenantModule.where({ moduleKey: key }).update({
      enabled: true,
      enabledAt: now,
      disabledAt: null,
      firstEnabledAt: row.firstEnabledAt ?? now,
    })
    return { firstTime: row.firstEnabledAt === null }
  }).then(async (result) => {
    // The manifest hook runs once per fresh enable — a module can seed or
    // sync here, but never on re-enable (spec/15, "Lifecycle").
    if (result.firstTime) {
      const hook = (manifest as { lifecycle?: { onEnable?: unknown } }).lifecycle?.onEnable as
        ((ctx: TenantContext) => Promise<void>) | undefined
      if (hook) await hook(ctx)
    }
    return result
  })
}

/**
 * Turns a module off for the tenant, keeping its data. Idempotent. Refused
 * with the dependants listed while an enabled module depends on it.
 */
export async function disableModule(
  ctx: TenantContext,
  key: string,
  registry: ModuleRegistry = moduleRegistry
): Promise<void> {
  const dependants = dependantsOf(key, registry, await enabledModules(ctx))
  if (dependants.length > 0) throw new AppError("conflict", { field: `dependants:${dependants.join(",")}` })
  const changed = await tenantDb(ctx, (db) =>
    db.TenantModule.where({ moduleKey: key, enabled: true }).updateAndCount({ enabled: false, disabledAt: nowTs() })
  )
  if (changed > 0) {
    const hook = (registry[key] as { lifecycle?: { onDisable?: unknown } }).lifecycle?.onDisable as
      ((ctx: TenantContext) => Promise<void>) | undefined
    if (hook) await hook(ctx)
  }
}
