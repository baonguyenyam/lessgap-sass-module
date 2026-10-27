import { pendingMigrations, type MigrationEdge } from "@/lib/migration-chain"

/**
 * Where the database stands against the contract the build was made with, in
 * the words the admin page uses (spec/adr/0023).
 *
 * - `current`: the marker is the contract; nothing to apply.
 * - `behind`: the listed migrations, oldest first, take it there.
 * - `unknown`: the marker is on no path to the contract (changed outside the
 *   migration system, or built from another branch). Applying is refused: the
 *   migration runner would refuse too, and the fix is a person's call.
 */
export type MigrationStatus =
  { state: "current" } | { state: "behind"; pending: string[] } | { state: "unknown"; marker: string | null }

export function migrationStatus(
  edges: readonly MigrationEdge[],
  marker: string | null,
  target: string
): MigrationStatus {
  if (marker === target) return { state: "current" }
  const path = pendingMigrations(edges, marker, target)
  if (path === null) return { state: "unknown", marker }
  return { state: "behind", pending: path.map((edge) => edge.name) }
}

/**
 * A migration name for people: `20261027T1727_kit_member_status` →
 * `kit member status`, with the date kept apart.
 */
export function describeMigration(name: string): { label: string; date: string | null } {
  const match = /^(\d{4})(\d{2})(\d{2})T\d{4}_(.+)$/.exec(name)
  if (!match) return { label: name, date: null }
  const [, y, m, d, rest] = match
  return { label: rest.replaceAll("_", " "), date: `${y}-${m}-${d}` }
}
