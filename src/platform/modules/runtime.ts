import { moduleRegistry } from "@/modules/registry"

/** Reports availability while entitlement and tenant switches are not implemented yet. */
export function isModuleActive(
  key: string,
  platformSwitches: Readonly<Record<string, unknown>>,
  registeredModules: Readonly<Record<string, unknown>> = moduleRegistry
): boolean {
  return Object.hasOwn(registeredModules, key) && platformSwitches[`module.${key}`] === true
}
