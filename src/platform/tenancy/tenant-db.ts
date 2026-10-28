import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import type { TenantContext } from "@/platform/tenancy/context"
import { MODEL_CLASSIFICATION } from "@/platform/tenancy/models"

/**
 * The scoped client (spec/02-tenancy.md, line 1; task 1.5). Module and
 * dashboard code reads and writes tenant-owned rows only through it:
 *
 *   await tenantDb(ctx, (db) => db.TenantSetting.where({ key }).first())
 *
 * Everything runs in one transaction that sets `app.tenant_id` (line 2, RLS),
 * and every collection it hands out is already narrowed to `ctx.tenantId`:
 * reads, updates and deletes carry the filter, creates get the tenant id, and
 * data naming another tenant throws instead of moving a row across tenants.
 */

type Orm = typeof db8.orm.public
export type TenantOwnedModel = {
  [M in keyof typeof MODEL_CLASSIFICATION]: (typeof MODEL_CLASSIFICATION)[M]["kind"] extends "tenant-owned" ? M : never
}[keyof typeof MODEL_CLASSIFICATION] &
  keyof Orm

export type TenantScopedDb = { readonly [M in TenantOwnedModel]: Orm[M] }

const TENANT_OWNED = Object.entries(MODEL_CLASSIFICATION)
  .filter(([, classification]) => classification.kind === "tenant-owned")
  .map(([model]) => model) as TenantOwnedModel[]

const CREATES = new Set(["create", "createAll", "createAndCount", "upsert"])
const UPDATES = new Set(["update", "updateAll", "updateAndCount"])

function guardTenant(data: unknown, tenantId: string): void {
  const rows = Array.isArray(data) ? data : [data]
  for (const row of rows) {
    const given = (row as { tenantId?: unknown } | null)?.tenantId
    if (given !== undefined && given !== tenantId) throw new AppError("forbidden")
  }
}

function withTenant(data: unknown, tenantId: string): unknown {
  guardTenant(data, tenantId)
  return Array.isArray(data) ? data.map((row) => ({ ...row, tenantId })) : { ...(data as object), tenantId }
}

/**
 * Wraps one collection so every call stays inside `tenantId`, including the
 * collections its chain methods (`where`, `select`, `orderBy`…) return.
 * Exported for the unit test (T4); code uses `tenantDb`.
 */
export function scopeCollection<C extends object>(collection: C, tenantId: string): C {
  const narrowed = (collection as unknown as { where: (filter: object) => C }).where({ tenantId })
  const wrap = (target: object): object =>
    new Proxy(target, {
      get(obj, prop, receiver) {
        const value = Reflect.get(obj, prop, receiver)
        if (typeof value !== "function") return value
        return (...args: unknown[]) => {
          if (typeof prop === "string" && CREATES.has(prop)) {
            if (prop === "upsert") {
              const options = args[0] as { create: unknown; update: unknown }
              args[0] = { ...options, create: withTenant(options.create, tenantId) }
              guardTenant(options.update, tenantId)
            } else {
              args[0] = withTenant(args[0], tenantId)
            }
          }
          if (typeof prop === "string" && UPDATES.has(prop)) guardTenant(args[0], tenantId)
          const result = value.apply(obj, args)
          const chained =
            result && typeof result === "object" && typeof (result as { where?: unknown }).where === "function"
          return chained ? wrap(result) : result
        }
      },
    })
  return wrap(narrowed) as C
}

/** Runs `fn` with a client scoped to `ctx.tenantId`, in one transaction with `app.tenant_id` set. */
export async function tenantDb<T>(ctx: TenantContext, fn: (db: TenantScopedDb) => PromiseLike<T>): Promise<T> {
  if (!ctx.tenantId) throw new AppError("forbidden")
  return db8.transaction(async (tx) => {
    await tx.query(
      tx.raw.sql`SELECT set_config('app.tenant_id', ${ctx.tenantId}, true) AS tenant`
        .returnsRow({ tenant: "pg/text@1" })
        .build()
    )
    const scoped = Object.fromEntries(
      TENANT_OWNED.map((model) => [model, scopeCollection(tx.orm.public[model] as object, ctx.tenantId)])
    ) as TenantScopedDb
    // Awaited here, inside the transaction: an ORM read is a lazy thenable.
    return await fn(scoped)
  })
}
