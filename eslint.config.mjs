import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import { existsSync, readdirSync } from "node:fs"
import path from "node:path"

// Prisma 8 only: nothing may bring Prisma 7 back (AGENTS.md, .agents/rules/database.md).
const PRISMA_7 = [
  { name: "@prisma/client", message: "Prisma 7 is gone. Use db8 from @/lib/db8 (Prisma ORM 8)." },
  { name: "@prisma/adapter-pg", message: "Prisma 7 is gone. Use db8 from @/lib/db8 (Prisma ORM 8)." },
  // The Prisma 7-shaped facade over db8, removed in 2.8.0.
  { name: "@/lib/prisma", message: 'Removed. Use the Prisma 8 client: import { db8 } from "@/lib/db8".' },
]
const PRISMA_7_PATTERNS = [{ group: ["@prisma/prisma7", "@prisma/prisma7/*"], message: "Prisma 7 is gone." }]

// No parent-relative imports: `@/` for anything under src/, `#src/...` from the
// plain Node scripts in scripts/ (package.json "imports"). Same-folder `./`
// imports stay allowed. Generated migrations (migrations/) are exempt below.
const NO_PARENT = [{ group: ["../*", "../**"], message: "Use the @/ alias (or #src/ in scripts/*.mjs) instead of ../" }]

// One way to make identifiers: @/lib/ids (spec/adr/0013-identifier-strategy.md).
const ID_LIBRARIES = ["uuid", "nanoid", "cuid", "@paralleldrive/cuid2", "ulid", "ulidx"].map((name) => ({
  name,
  message: "Make identifiers with @/lib/ids (newId, newTimeId, newPublicCode, newUrlToken).",
}))
const ID_PATTERNS = [{ group: ["uniku", "uniku/*"], message: "Make identifiers with @/lib/ids." }]
const NO_RANDOM_UUID = {
  selector: "CallExpression[callee.property.name='randomUUID']",
  message: "Make identifiers with @/lib/ids (newTimeId for a UUID).",
}

const BASE_RESTRICTED_IMPORTS = {
  paths: [...PRISMA_7, ...ID_LIBRARIES],
  patterns: [...NO_PARENT, ...PRISMA_7_PATTERNS, ...ID_PATTERNS],
}

function moduleImportPattern(prefix, moduleKey, message, allowedPaths, allowTypeImports = false) {
  const modulePath = `${prefix}/modules/${moduleKey}`
  return {
    regex: `^${modulePath}(?:$|/(?!${allowedPaths}$).+)$`,
    message,
    ...(allowTypeImports ? { allowTypeImports: true } : {}),
  }
}

function moduleKeysOnDisk() {
  const modulesDirectory = path.resolve("src/modules")
  if (!existsSync(modulesDirectory)) return []
  return readdirSync(modulesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(path.join(modulesDirectory, entry.name, "module.ts")))
    .map((entry) => entry.name)
    .sort()
}

/** Creates the module, theme and kernel import boundaries for the current registry. */
export function moduleBoundaryOverrides(moduleKeys = moduleKeysOnDisk()) {
  const moduleRules = moduleKeys.map((moduleKey) => ({
    files: [`src/modules/${moduleKey}/**/*`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          ...BASE_RESTRICTED_IMPORTS,
          patterns: [
            ...BASE_RESTRICTED_IMPORTS.patterns,
            ...moduleKeys
              .filter((otherKey) => otherKey !== moduleKey)
              .flatMap((otherKey) => [
                moduleImportPattern(
                  "@",
                  otherKey,
                  "Import another module only through its server public index or typed events.",
                  "(?:server|server/index(?:\\.ts)?|events(?:\\.ts)?)"
                ),
                moduleImportPattern(
                  "#src",
                  otherKey,
                  "Import another module only through its server public index or typed events.",
                  "(?:server|server/index(?:\\.ts)?|events(?:\\.ts)?)"
                ),
              ]),
          ],
        },
      ],
    },
  }))

  const themeRules = {
    files: ["src/themes/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          ...BASE_RESTRICTED_IMPORTS,
          patterns: [
            ...BASE_RESTRICTED_IMPORTS.patterns,
            ...moduleKeys.flatMap((moduleKey) => [
              moduleImportPattern(
                "@",
                moduleKey,
                "Themes may import module site blocks and types only.",
                "site(?:/.*)?",
                true
              ),
              moduleImportPattern(
                "#src",
                moduleKey,
                "Themes may import module site blocks and types only.",
                "site(?:/.*)?",
                true
              ),
            ]),
          ],
        },
      ],
    },
  }

  const platformRules = {
    files: ["src/platform/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          ...BASE_RESTRICTED_IMPORTS,
          patterns: [
            ...BASE_RESTRICTED_IMPORTS.patterns,
            {
              regex: "^@/modules/(?!registry(?:\\.ts)?$).+$",
              message: "The platform kernel may import modules only through the generated registry.",
            },
            {
              regex: "^#src/modules/(?!registry(?:\\.ts)?$).+$",
              message: "The platform kernel may import modules only through the generated registry.",
            },
          ],
        },
      ],
    },
  }

  return [...moduleRules, themeRules, platformRules]
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated by `npm run test:coverage`: linting a coverage report is noise,
    // and its vendored scripts trip rules they were never written against.
    "coverage/**",
    // Written by the Prisma 8 CLI (contract emit, migration plan): generated,
    // content-addressed, and never edited by hand.
    "migrations/**",
    // Prisma 8 contract artifacts (`prisma contract emit`) and the `prisma
    // skills sync` reference copies: generated files and vendor docs are not
    // ours to lint.
    "src/generated/prisma8/**",
    ".agents/skills/**",
    ".claude/skills/**",
    ".cursor/skills/**",
    ".devin/skills/**",
  ]),
  // One import policy for the whole repository. ESLint replaces a rule set in
  // an earlier block instead of merging it, so every block below spreads the
  // same lists rather than restating them.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [...PRISMA_7, ...ID_LIBRARIES], patterns: [...NO_PARENT, ...PRISMA_7_PATTERNS, ...ID_PATTERNS] },
      ],
      "no-restricted-syntax": ["error", NO_RANDOM_UUID],
    },
  },
  // The one file allowed to import the generators.
  {
    files: ["src/lib/ids.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [...PRISMA_7, ...ID_LIBRARIES], patterns: [...NO_PARENT, ...PRISMA_7_PATTERNS] },
      ],
    },
  },
  ...moduleBoundaryOverrides(),
])

export default eslintConfig
