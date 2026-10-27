import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Fields share one size scale (src/components/ui/field.ts): a height set by
 * hand on an Input, Textarea or select trigger is how a select ends up taller
 * than the input beside it. And a bare `<select>` puts the browser's arrow
 * against the border: forms use `NativeSelect` or `Select`.
 */
const ROOT = process.cwd()

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
    .map((e) => join(e.parentPath, e.name))
    .filter((file) => !file.includes(join("components", "ui")))
}

describe("UI consistency", () => {
  const files = sourceFiles("src")

  it("never sizes a field by hand", () => {
    const offenders: string[] = []
    for (const file of files) {
      const source = readFileSync(file, "utf8")
      for (const match of source.matchAll(/<(Input|Textarea|SelectTrigger|NativeSelect)\b([\s\S]*?)\/?>/g)) {
        const className = /className="([^"]*)"/.exec(match[2])?.[1] ?? ""
        if (/(^|\s)h-\d+(\s|$)/.test(className)) {
          offenders.push(
            `${relative(ROOT, file)}:${source.slice(0, match.index).split("\n").length} <${match[1]}> ${className}`
          )
        }
      }
    }
    expect(offenders, 'use size="sm" | "md" | "lg" instead').toEqual([])
  })

  it("uses no bare <select>", () => {
    const offenders = files.filter((file) => /<select\b/.test(readFileSync(file, "utf8"))).map((f) => relative(ROOT, f))
    expect(offenders, "use NativeSelect (server forms) or Select (client components)").toEqual([])
  })
})
