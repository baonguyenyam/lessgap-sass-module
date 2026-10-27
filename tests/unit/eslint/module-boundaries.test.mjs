import { describe, expect, it } from "vitest"
import { Linter } from "eslint"
import { pathToFileURL } from "node:url"
import path from "node:path"

const { moduleBoundaryOverrides } = await import(pathToFileURL(path.resolve("eslint.config.mjs")).href)
const config = [
  { files: ["**/*.ts", "**/*.tsx"], languageOptions: { ecmaVersion: "latest", sourceType: "module" } },
  ...moduleBoundaryOverrides(["booking", "catalog"]),
]
const linter = new Linter({ cwd: process.cwd() })

function lint(code, filename) {
  return linter.verify(code, config, { filename })
}

function expectBoundaryError(code, filename) {
  expect(lint(code, filename).map((message) => message.ruleId)).toContain("no-restricted-imports")
}

describe("module import boundaries", () => {
  it("rejects imports from another module's internals", () => {
    expectBoundaryError('import { price } from "@/modules/catalog/lib/price"', "src/modules/booking/server/pricing.ts")
  })

  it("allows another module's public server index and typed events", () => {
    expect(
      lint(
        'import { getCatalog } from "@/modules/catalog/server"; import { serviceArchived } from "@/modules/catalog/events"',
        "src/modules/booking/server/pricing.ts"
      )
    ).toEqual([])
  })

  it("rejects deep imports into another module's server folder", () => {
    expectBoundaryError(
      'import { getCatalog } from "@/modules/catalog/server/private"',
      "src/modules/booking/server/pricing.ts"
    )
  })
})

describe("theme import boundaries", () => {
  it("rejects module services but allows site blocks", () => {
    expectBoundaryError('import { getCatalog } from "@/modules/catalog/server"', "src/themes/modern/page.tsx")
    expect(lint('import { CatalogBlock } from "@/modules/catalog/site"', "src/themes/modern/page.tsx")).toEqual([])
  })
})

describe("kernel import boundaries", () => {
  it("rejects module imports except through the generated registry", () => {
    expectBoundaryError('import booking from "@/modules/booking/module"', "src/platform/modules/loader.ts")
    expect(lint('import { moduleRegistry } from "@/modules/registry"', "src/platform/modules/loader.ts")).toEqual([])
  })
})
