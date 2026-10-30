/**
 * Finds `t("key")` calls the message file can't answer — the same sweep that
 * caught the MISSING_MESSAGE errors. A key resolves when it exists at the
 * namespace root or under its $kit/$product variants (collapseMessages
 * flattens one at runtime). Aliases from tenantPath-style helpers are
 * ignored — only useTranslations/getTranslations bindings count.
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const en = JSON.parse(readFileSync("src/locales/en.json", "utf8"))
const get = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o)
const has = (full) => {
  const [ns, ...rest] = full.split(".")
  return (
    get(en, full) != null ||
    get(en, `${ns}.$kit.${rest.join(".")}`) != null ||
    get(en, `${ns}.$product.${rest.join(".")}`) != null
  )
}

const missing = []
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) {
      if (f !== "node_modules" && f !== ".next") walk(p)
      continue
    }
    if (!/\.(tsx?|ts)$/.test(f)) continue
    const s = readFileSync(p, "utf8")
    const aliases = {}
    for (const m of s.matchAll(
      /const\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(["']([^"']+)["']\)/g
    )) {
      aliases[m[1]] = m[2]
    }
    for (const [alias, ns] of Object.entries(aliases)) {
      const re = new RegExp(`\\b${alias}\\(["']([^"']+)["']\\)`, "g")
      for (const m of s.matchAll(re)) {
        const key = m[1]
        if (!/^[a-z][a-zA-Z0-9_.]*$/.test(key)) continue
        if (!has(`${ns}.${key}`)) missing.push(`${p} → ${ns}.${key}`)
      }
    }
  }
}
walk("src")

if (missing.length > 0) {
  console.error(`${missing.length} missing message(s):\n${missing.join("\n")}`)
  process.exit(1)
}
console.log("All t() keys resolve in en.json.")
