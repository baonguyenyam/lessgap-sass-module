import { readdirSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Every test lives under tests/ (spec/adr/0016-tests-live-in-tests.md). Vitest
 * only collects tests/, so a test written beside its source would never run:
 * this is what makes that mistake fail instead of passing silently.
 */
const ROOT = process.cwd()
const TEST_FILE = /\.(test|spec)\.(ts|tsx|mts|mjs|js)$/

function testFilesUnder(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && TEST_FILE.test(entry.name)) {
      found.push(relative(ROOT, join(entry.parentPath, entry.name)).replace(/\\/g, "/"))
    }
  }
  return found
}

describe("repository layout", () => {
  it("keeps no test file in src/ or scripts/", () => {
    expect([...testFilesUnder("src"), ...testFilesUnder("scripts")]).toEqual([])
  })
})
