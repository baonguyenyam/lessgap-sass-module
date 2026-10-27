import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { siteConfig } from "@/config/site"

/**
 * The version is declared in two places in this clone (three on npm), and
 * nothing used to compare them.
 *
 * `package.json` is the number npm sees and `siteConfig.version` is the
 * number the app serves at `/api/health`; the release smoke catches a stale
 * `site.ts` because it calls the health endpoint. npm's `package-lock.json`
 * carried a third copy that **npm does not update when you edit
 * `package.json`** — it said 1.6.0 at the 1.6.2 release and 1.6.2 at the
 * 1.6.3 one, in a file the public repository shows to anyone. This clone
 * installs with pnpm, and `pnpm-lock.yaml` does not record the project
 * version, so that check only runs when an npm lockfile exists.
 *
 * If the npm check fails after a version bump, the fix is
 * `npm install --package-lock-only` and committing the result.
 */
const ROOT = process.cwd()
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"))

describe("declared version", () => {
  const pkg = read("package.json")

  it("matches between package.json and the app config", () => {
    expect(siteConfig.version).toBe(pkg.version)
  })

  const lockPath = path.join(ROOT, "package-lock.json")
  it.runIf(fs.existsSync(lockPath))("matches in package-lock.json, which npm will not update on its own", () => {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"))
    expect(lock.version).toBe(pkg.version)
    // The lockfile repeats it inside the root package entry, and that copy
    // is the one npm actually reads back.
    expect(lock.packages[""].version).toBe(pkg.version)
  })
})
