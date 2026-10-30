import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { scaffoldModule } from "#scripts/new-module.mjs"

let temporaryRoot
let modulesPath
const templatePath = path.resolve(process.cwd(), "scripts", "templates", "module")

beforeEach(() => {
  temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "lessgap-module-scaffold-"))
  modulesPath = path.join(temporaryRoot, "modules")
})

afterEach(() => rmSync(temporaryRoot, { recursive: true, force: true }))

function filesBelow(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    return entry.isDirectory() ? filesBelow(path.join(directory, entry.name), relative) : [relative]
  })
}

describe("scaffoldModule", () => {
  it("creates the standard module shape and registers its experimental manifest", () => {
    const modulePath = scaffoldModule("demo_check", { modulesPath, templatePath })

    expect(filesBelow(modulePath).sort()).toEqual([
      "actions.ts",
      "components/README.md",
      "events.ts",
      "jobs.ts",
      "lib/README.md",
      "module.ts",
      "schema.ts",
      "server/index.ts",
      "site/README.md",
    ])
    expect(readFileSync(path.join(modulePath, "module.ts"), "utf8")).toContain('stage: "experimental"')
    expect(readFileSync(path.join(modulesPath, "registry.ts"), "utf8")).toContain("demo_check: module_0,")
  })

  it("rejects invalid keys before creating a folder", () => {
    expect(() => scaffoldModule("Bad Key", { modulesPath, templatePath })).toThrow("lowercase")
    expect(readdirSync(temporaryRoot)).toEqual([])
  })

  it("refuses to overwrite an existing module", () => {
    const modulePath = scaffoldModule("demo_check", { modulesPath, templatePath })
    const original = readFileSync(path.join(modulePath, "module.ts"), "utf8")

    expect(() => scaffoldModule("demo_check", { modulesPath, templatePath })).toThrow("already exists")
    expect(readFileSync(path.join(modulePath, "module.ts"), "utf8")).toBe(original)
  })
})
