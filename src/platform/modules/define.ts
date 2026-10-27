import { moduleManifestSchema, type ModuleManifestInput } from "@/platform/modules/manifest-schema"

/** Validates a module manifest once when its registry is loaded. */
export function defineModule(manifest: ModuleManifestInput) {
  return moduleManifestSchema.parse(manifest)
}
