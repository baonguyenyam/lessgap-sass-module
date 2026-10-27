#!/usr/bin/env node
/**
 * Fails when a Prisma model has no deliberate data classification.
 *
 *   pnpm audit:tenancy
 */

import { readFileSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { MODEL_CLASSIFICATION } from "#src/platform/tenancy/models.ts"

const root = path.resolve(import.meta.dirname, "..")

export function findUnclassifiedModels(contract, classifications = MODEL_CLASSIFICATION) {
  const roots = contract?.roots
  if (!roots || typeof roots !== "object" || Array.isArray(roots)) {
    throw new TypeError("The Prisma contract must contain a roots object.")
  }

  return Object.keys(roots).filter((model) => !Object.hasOwn(classifications, model))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const contractPath = path.join(root, "src", "generated", "prisma8", "contract.json")
  const contract = JSON.parse(readFileSync(contractPath, "utf8"))
  const unclassified = findUnclassifiedModels(contract)

  if (unclassified.length > 0) {
    console.error(`Unclassified Prisma models: ${unclassified.join(", ")}`)
    console.error("Add each model to src/platform/tenancy/models.ts with a class and reason.")
    process.exitCode = 1
  } else {
    console.log(`Tenancy audit passed: ${Object.keys(contract.roots).length} models classified.`)
  }
}
