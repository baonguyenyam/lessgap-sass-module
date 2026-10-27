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

  // Long lists need a search box, and a field loading its options needs a
  // spinner: OptionSelect does both, so it is the only way to pick from a list.
  it("picks from lists only through OptionSelect", () => {
    const offenders = files
      .filter((file) => !file.includes(join("components", "form")))
      .filter((file) => readFileSync(file, "utf8").includes('from "@/components/ui/select"'))
      .map((f) => relative(ROOT, f))
    expect(offenders, "use OptionSelect from @/components/form/option-select").toEqual([])
  })

  it("uses no bare <select>", () => {
    const offenders = files.filter((file) => /<select\b/.test(readFileSync(file, "utf8"))).map((f) => relative(ROOT, f))
    expect(offenders, "use NativeSelect (server forms) or Select (client components)").toEqual([])
  })

  it("casts no shadows", () => {
    const offenders = files
      .filter((file) => /(^|[\s"'`:])shadow-(?!none\b)/m.test(readFileSync(file, "utf8")))
      .map((f) => relative(ROOT, f))
    expect(offenders, "the UI is flat: separate surfaces with a border or a ring").toEqual([])
  })
})

/**
 * Every app page loads the same way: its own `loading.tsx` with a
 * `PageSkeleton`. A parent boundary does not show for a navigation between
 * sibling pages, so each page folder needs one.
 */
describe("page loading", () => {
  const pageDirs = ["src/app/(dashboard)/dashboard", "src/app/(admin)/admin"].flatMap((dir) =>
    readdirSync(join(ROOT, dir), { withFileTypes: true, recursive: true })
      .filter((e) => e.isFile() && e.name === "page.tsx")
      .map((e) => e.parentPath)
  )

  it("finds the app pages", () => {
    expect(pageDirs.length).toBeGreaterThan(10)
  })

  it.each(pageDirs.map((dir) => [relative(ROOT, dir), dir]))("%s has a PageSkeleton loading.tsx", (_, dir) => {
    const loading = join(dir, "loading.tsx")
    expect(readdirSync(dir)).toContain("loading.tsx")
    expect(readFileSync(loading, "utf8")).toContain("<PageSkeleton")
  })
})
