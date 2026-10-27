#!/usr/bin/env node
/** Creates a module from the shared module template. */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { generateRegistrySource } from "#scripts/generate-module-registry.mjs"

const root = path.resolve(import.meta.dirname, "..")
const MODULE_KEY = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/

/** Scaffolds a module folder and updates the generated registry atomically. */
export function scaffoldModule(
  key,
  {
    modulesPath = path.join(root, "src", "modules"),
    templatePath = path.join(root, "scripts", "templates", "module"),
  } = {}
) {
  if (typeof key !== "string" || !MODULE_KEY.test(key)) {
    throw new Error("Module key must be lowercase kebab-case or snake_case.")
  }

  const modulePath = path.join(modulesPath, key)
  if (existsSync(modulePath)) throw new Error(`Module already exists: ${key}`)

  mkdirSync(modulesPath, { recursive: true })
  const registryPath = path.join(modulesPath, "registry.ts")
  const previousRegistry = existsSync(registryPath) ? readFileSync(registryPath, "utf8") : null

  try {
    copyTemplate(templatePath, modulePath, key)
    const keys = readdirSync(modulesPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(path.join(modulesPath, entry.name, "module.ts")))
      .map((entry) => entry.name)
    writeFileSync(registryPath, generateRegistrySource(keys))
    return modulePath
  } catch (error) {
    rmSync(modulePath, { recursive: true, force: true })
    if (previousRegistry === null) rmSync(registryPath, { force: true })
    else writeFileSync(registryPath, previousRegistry)
    throw error
  }
}

function copyTemplate(templatePath, destination, key) {
  mkdirSync(destination, { recursive: true })
  for (const entry of readdirSync(templatePath, { withFileTypes: true })) {
    const templateEntry = path.join(templatePath, entry.name)
    const destinationName = entry.name.endsWith(".tpl") ? entry.name.slice(0, -4) : entry.name
    const destinationEntry = path.join(destination, destinationName)
    if (entry.isDirectory()) {
      mkdirSync(destinationEntry, { recursive: true })
      copyTemplate(templateEntry, destinationEntry, key)
      continue
    }

    const content = readFileSync(templateEntry, "utf8").replaceAll("__MODULE_KEY__", key)
    writeFileSync(destinationEntry, content)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [key, ...extra] = process.argv.slice(2)
  if (!key || extra.length > 0) {
    console.error("Usage: pnpm new:module <key>")
    process.exitCode = 1
  } else {
    try {
      scaffoldModule(key)
      console.info(`Created module ${key}.`)
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    }
  }
}
