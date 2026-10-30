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
  // Every app area: the tenant dashboard (`/t/[slug]`, task 1.7), the account
  // pages, the admin panel and the platform console.
  const pageDirs = ["src/app/(dashboard)", "src/app/(admin)", "src/app/(platform)"].flatMap((dir) =>
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

  // Until a route is converted (spec/adr/0022), its page opts out of instant
  // navigation; without it the dev server reports every request read outside
  // <Suspense> as an error in the console.
  it.each(pageDirs.map((dir) => [relative(ROOT, dir), dir]))("%s/page.tsx opts out of instant", (_, dir) => {
    expect(readFileSync(join(dir, "page.tsx"), "utf8")).toMatch(/export const instant = false/)
  })
})

/**
 * An empty list or section draws the shared `EmptyState` (the same dashed box
 * as an empty invoice history), never a bare grey line such as
 * `<p className="text-muted-foreground">{t("empty")}</p>`.
 */
describe("empty states", () => {
  const files = ["src/app", "src/components"].flatMap((dir) =>
    readdirSync(join(ROOT, dir), { withFileTypes: true, recursive: true })
      // Public sites are drawn by tenant themes, not the app's design.
      .filter(
        (e) =>
          e.isFile() &&
          e.name.endsWith(".tsx") &&
          !e.parentPath.includes("components/ui") &&
          !e.parentPath.includes(join("src", "app", "sites"))
      )
      .map((e) => join(e.parentPath, e.name))
  )
  const bareEmpty =
    /<(p|li|div|span)\s+className="[^"]*text-muted-foreground[^"]*">\s*\{t\("(empty|none|no_[a-z_]+|[a-z_]+_empty|none_[a-z_]+)"\)\}\s*<\/\1>/

  // Like Newsletter's empty box: a short title and one sentence saying what
  // fills the list. Only the compact size (a board column) may skip it.
  it("gives every empty box a description", () => {
    const offenders = files.flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/<EmptyState\b[\s\S]*?\/>/g)]
        .filter(([tag]) => !/description=/.test(tag) && !/size="compact"/.test(tag) && !tag.includes("{...empty}"))
        .map(([tag]) => `${relative(ROOT, file)}: ${tag.replace(/\s+/g, " ").slice(0, 80)}`)
    )
    expect(offenders).toEqual([])
  })

  it("never renders an empty message as plain text", () => {
    const offenders = files.filter((file) => bareEmpty.test(readFileSync(file, "utf8"))).map((f) => relative(ROOT, f))
    expect(offenders).toEqual([])
  })
})

describe("page errors", () => {
  it.each(["src/app/(dashboard)/dashboard", "src/app/(admin)/admin"])("%s catches errors with RouteError", (dir) => {
    expect(readFileSync(join(ROOT, dir, "error.tsx"), "utf8")).toContain("<RouteError")
  })
})
