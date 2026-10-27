/**
 * How far a database is from the code, measured on the Prisma 8 migration graph.
 *
 * Every migration in `migrations/app/` is an edge from one contract hash to the
 * next (`from` is null for the baseline). The database records the hash it is
 * at in its marker (`prisma_contract.marker.core_hash`), and the code expects
 * the hash of the contract it was built with. The number of migrations to apply
 * is the length of the path between the two.
 *
 * Kept free of imports and of non-erasable TypeScript, so scripts/check-deploy.mjs
 * can import this file directly under Node's type stripping.
 */

export type MigrationEdge = { name: string; from: string | null; to: string }

/**
 * The migrations still to apply to reach `target` from `marker`, oldest first.
 *
 * - `marker === target` → none.
 * - `marker === null` (the database was never migrated or signed) → the whole
 *   path from the baseline.
 * - `marker` not on the path to `target` (a database changed outside the
 *   migration system, or built from another branch) → null: unknown, which is a
 *   different answer from "behind".
 * - `target` reached by no migration (the contract changed and nobody planned a
 *   migration for it) → null as well.
 */
export function pendingMigrations(
  edges: readonly MigrationEdge[],
  marker: string | null,
  target: string
): MigrationEdge[] | null {
  if (marker === target) return []

  const byTo = new Map<string, MigrationEdge>()
  for (const edge of edges) byTo.set(edge.to, edge)

  const path: MigrationEdge[] = []
  const seen = new Set<string>()
  let hash: string | null = target
  while (hash !== null && hash !== marker) {
    if (seen.has(hash)) return null
    seen.add(hash)
    const edge = byTo.get(hash)
    if (!edge) return null
    path.unshift(edge)
    hash = edge.from
  }
  return hash === marker ? path : null
}
