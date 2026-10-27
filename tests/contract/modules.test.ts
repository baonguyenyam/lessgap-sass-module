import { describe, expect, it } from "vitest"
import { moduleRegistry } from "@/modules/registry"
import { moduleManifestSchema } from "@/platform/modules/manifest-schema"
import { MODEL_CLASSIFICATION } from "@/platform/tenancy/models"
import { validateModuleGraph } from "@/platform/modules/manifest-schema"

const entries = Object.entries(moduleRegistry)
const modules = entries.map(([, manifest]) => manifest)

describe("registered module contracts", () => {
  it("keeps the registry keys aligned with manifest keys", () => {
    expect(entries.map(([key, manifest]) => manifest.key === key).every(Boolean)).toBe(true)
  })

  it("loads every manifest through defineModule validation", () => {
    expect(modules.map((manifest) => moduleManifestSchema.safeParse(manifest).success).every(Boolean)).toBe(true)
  })

  it("keeps required dependencies registered without cycles", () => {
    expect(() => validateModuleGraph(modules)).not.toThrow()
  })

  it("classifies every model declared by a module", () => {
    const unclassified = modules.flatMap((manifest) =>
      manifest.models.filter((model) => !Object.hasOwn(MODEL_CLASSIFICATION, model))
    )

    expect(unclassified).toEqual([])
  })
})
