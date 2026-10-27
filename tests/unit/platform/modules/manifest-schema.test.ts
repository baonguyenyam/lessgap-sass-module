import { describe, expect, it } from "vitest"
import { defineModule } from "@/platform/modules/define"
import { moduleManifestSchema, type ModuleManifestInput } from "@/platform/modules/manifest-schema"

const manifestFixture: ModuleManifestInput = {
  key: "booking",
  name: "modules.booking.name",
  version: "1.2.3",
  stage: "experimental",
  dependsOn: ["catalog"],
  permissions: ["booking.read"],
  models: ["Appointment"],
}

describe("moduleManifestSchema", () => {
  it("accepts and loads a valid module fixture", () => {
    expect(defineModule(manifestFixture)).toMatchObject({
      key: "booking",
      stage: "experimental",
      dependsOn: ["catalog"],
      optionalDependsOn: [],
      permissions: ["booking.read"],
    })
  })

  it.each([
    ["key", { key: "Booking" }],
    ["name", { name: "" }],
    ["version", { version: "1.2" }],
    ["stage", { stage: "preview" }],
    ["dependsOn", { dependsOn: ["Bad Key"] }],
    ["optionalDependsOn", { optionalDependsOn: ["Bad Key"] }],
    ["permissions", { permissions: ["manage"] }],
    ["models", { models: ["appointment"] }],
    ["features", { features: "not-an-object" }],
    ["settings", { settings: { not: "a Zod schema" } }],
    ["dashboard", { dashboard: { nav: [{ href: "", label: "label", icon: "icon" }] } }],
    ["site", { site: { pages: ["bad page"] } }],
    ["events", { events: { emits: ["bad event"] } }],
    ["jobs", { jobs: { invalid: { schedule: "daily", handler: () => undefined } } }],
    ["extensionPoints", { extensionPoints: { invalid: "label" } }],
    ["extends", { extends: { invalid: {} } }],
    ["lifecycle", { lifecycle: { onEnable: true } }],
  ] as const)("rejects an invalid %s field", (_field, invalidField) => {
    expect(moduleManifestSchema.safeParse({ ...manifestFixture, ...invalidField }).success).toBe(false)
  })

  it("rejects a dependency declared as both required and optional", () => {
    expect(moduleManifestSchema.safeParse({ ...manifestFixture, optionalDependsOn: ["catalog"] }).success).toBe(false)
  })

  it("rejects undeclared manifest fields", () => {
    expect(moduleManifestSchema.safeParse({ ...manifestFixture, extra: true }).success).toBe(false)
  })
})
