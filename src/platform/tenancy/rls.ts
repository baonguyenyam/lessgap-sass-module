/**
 * The database side of tenant isolation (spec/02-tenancy.md, line 2):
 * every tenant-owned table has a policy `"tenantId" = current_setting('app.tenant_id', true)`,
 * declared in the contract with `@@rls` and a `policy_all` block, and the
 * scoped client sets that variable for its transaction only.
 */

/** The models the contract enables row-level security on. */
export function modelsWithRls(contractJson: unknown): string[] {
  const namespaces = (contractJson as { storage?: { namespaces?: Record<string, { entries?: { rls?: object } }> } })
    .storage?.namespaces
  return Object.values(namespaces ?? {}).flatMap((namespace) => Object.keys(namespace.entries?.rls ?? {}))
}

/** The statement that scopes one transaction to a tenant: `set_config(…, true)` is `SET LOCAL`. */
export const SET_TENANT_SQL = "SELECT set_config('app.tenant_id', $1, true)"
