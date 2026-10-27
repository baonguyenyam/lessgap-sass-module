import { describe, expect, it } from "vitest"
import { defineModule } from "@/platform/modules/define"
import { validateModuleGraph, type ModuleDependencyNode } from "@/platform/modules/manifest-schema"

const node = (key: string, dependsOn: string[] = [], optionalDependsOn: string[] = []): ModuleDependencyNode => ({
  key,
  dependsOn,
  optionalDependsOn,
})

describe("validateModuleGraph", () => {
  it("accepts an acyclic graph and ignores absent optional dependencies", () => {
    expect(() => validateModuleGraph([node("catalog"), node("booking", ["catalog"], ["payments"])])).not.toThrow()
  })

  it("rejects a dependency cycle", () => {
    expect(() => validateModuleGraph([node("booking", ["catalog"]), node("catalog", ["booking"])])).toThrow(
      "Module dependency cycle"
    )
  })

  it("rejects an unregistered required dependency", () => {
    expect(() => validateModuleGraph([node("booking", ["catalog"])])).toThrow("unregistered dependencies")
  })

  it("rejects duplicate module keys", () => {
    expect(() => validateModuleGraph([node("booking"), node("booking")])).toThrow("keys must be unique")
  })
})

describe("defineModule", () => {
  it("applies empty defaults when a manifest omits optional lists", () => {
    expect(
      defineModule({ key: "catalog", name: "modules.catalog.name", version: "1.0.0", stage: "experimental" })
    ).toMatchObject({ dependsOn: [], optionalDependsOn: [], permissions: [], models: [] })
  })
})
