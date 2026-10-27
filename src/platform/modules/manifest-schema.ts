import { z } from "zod"

const moduleKey = z.string().regex(/^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/)
const permission = z.string().regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/)
const modelName = z.string().regex(/^[A-Z][A-Za-z0-9]*$/)
const eventName = z.string().regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/)

/** Runtime contract for a module's declared capabilities and integrations. */
export const moduleManifestSchema = z
  .object({
    key: moduleKey,
    name: z.string().min(1),
    version: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
    stage: z.enum(["experimental", "beta", "stable", "deprecated"]),
    dependsOn: z.array(moduleKey).default([]),
    optionalDependsOn: z.array(moduleKey).default([]),
    features: z.record(z.string(), z.unknown()).optional(),
    permissions: z.array(permission).default([]),
    settings: z.custom((value) => value instanceof z.ZodType).optional(),
    models: z.array(modelName).default([]),
    dashboard: z
      .object({
        nav: z
          .array(
            z.object({
              href: z.string().min(1),
              label: z.string().min(1),
              icon: z.string().min(1),
              permission: permission.optional(),
            })
          )
          .default([]),
      })
      .strict()
      .optional(),
    site: z
      .object({ pages: z.array(moduleKey).default([]), blocks: z.array(moduleKey).default([]) })
      .strict()
      .optional(),
    events: z
      .object({
        emits: z.array(eventName).default([]),
        subscribes: z
          .record(
            eventName,
            z.custom((value) => typeof value === "function")
          )
          .default({}),
      })
      .strict()
      .optional(),
    jobs: z
      .record(
        eventName,
        z.object({ schedule: z.string().min(1), handler: z.custom((value) => typeof value === "function") }).strict()
      )
      .optional(),
    extensionPoints: z.record(eventName, z.string().min(1)).optional(),
    extends: z.record(eventName, z.unknown()).optional(),
    lifecycle: z
      .object({
        onEnable: z.custom((value) => typeof value === "function").optional(),
        onDisable: z.custom((value) => typeof value === "function").optional(),
        describeData: z.custom((value) => typeof value === "function").optional(),
        onExport: z.custom((value) => typeof value === "function").optional(),
        onPurge: z.custom((value) => typeof value === "function").optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((manifest, context) => {
    const optional = new Set(manifest.optionalDependsOn)
    for (const [index, dependency] of manifest.dependsOn.entries()) {
      if (optional.has(dependency)) {
        context.addIssue({
          code: "custom",
          path: ["dependsOn", index],
          message: `Dependency ${dependency} cannot be required and optional.`,
        })
      }
    }
    if (manifest.dependsOn.includes(manifest.key) || manifest.optionalDependsOn.includes(manifest.key)) {
      context.addIssue({ code: "custom", path: ["dependsOn"], message: "A module cannot depend on itself." })
    }
  })

export type ModuleManifest = z.output<typeof moduleManifestSchema>
export type ModuleManifestInput = z.input<typeof moduleManifestSchema>

export type ModuleDependencyNode = Pick<ModuleManifest, "key" | "dependsOn" | "optionalDependsOn">

/** Rejects missing required dependencies and cycles before the registry loads. */
export function validateModuleGraph(manifests: readonly ModuleDependencyNode[]): void {
  const byKey = new Map(manifests.map((manifest) => [manifest.key, manifest]))
  if (byKey.size !== manifests.length) throw new Error("Module keys must be unique.")

  const dependencies = new Map<string, string[]>()
  for (const manifest of manifests) {
    const required = manifest.dependsOn
    const missing = required.filter((key) => !byKey.has(key))
    if (missing.length > 0) {
      throw new Error(`Module ${manifest.key} requires unregistered dependencies: ${missing.join(", ")}.`)
    }
    dependencies.set(manifest.key, [...required, ...manifest.optionalDependsOn.filter((key) => byKey.has(key))])
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (key: string): void => {
    if (visiting.has(key)) throw new Error(`Module dependency cycle includes ${key}.`)
    if (visited.has(key)) return
    visiting.add(key)
    for (const dependency of dependencies.get(key) ?? []) visit(dependency)
    visiting.delete(key)
    visited.add(key)
  }

  for (const key of dependencies.keys()) visit(key)
}
