/**
 * One tenant per existing user (phase 1, task 1.12). The logic lives in
 * `src/platform/backfills/tenant-per-user.ts`; this wrapper loads the env,
 * wires `--apply` (dry-run by default) and reports.
 *
 *   pnpm exec tsx scripts/backfills/20261028-platform-tenant-per-user.ts --apply
 */
import { config } from "dotenv"
import { pathToFileURL } from "node:url"

config({ path: [".env.local", ".env"], quiet: true })

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { runTenantPerUserBackfill } = await import("@/platform/backfills/tenant-per-user")
  const apply = process.argv.includes("--apply")
  const result = await runTenantPerUserBackfill({ apply })
  console.log(
    `done: ${result.created} tenant${result.created === 1 ? "" : "s"} ` +
      `${apply ? "created" : "would be created"}, ${result.skipped} users already had one`
  )
  const { db8 } = await import("@/lib/db8")
  await db8.close()
}
