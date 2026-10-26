import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"

import type { MigrationEdge } from "@/lib/migration-chain"

/**
 * Reads the Prisma 8 migration graph from disk: one edge per migration package
 * in `migrationsDir` (normally `migrations/app`), from its `migration.json`,
 * sorted by directory name. Used by the build-time manifest generator, by
 * `pnpm check:deploy` and by the manifest test.
 *
 * Erasable TypeScript only, with no `@/` value imports: plain Node scripts
 * import this file directly (`#src/lib/migration-graph.ts`).
 */
export function readMigrationGraph(migrationsDir: string): MigrationEdge[] {
  if (!existsSync(migrationsDir)) return []
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(path.join(migrationsDir, entry.name, "migration.json")))
    .map((entry) => {
      const meta = JSON.parse(readFileSync(path.join(migrationsDir, entry.name, "migration.json"), "utf8"))
      return { name: entry.name, from: meta.from ?? null, to: meta.to }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}
