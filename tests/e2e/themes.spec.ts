import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { config } from "dotenv"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Theme fixtures (task 10.1, D8): every shared theme renders its fixture
 * site with zero serious-or-critical axe violations — the theme registry is
 * the source of which fixtures exist.
 */

let themes: (typeof import("@/themes/registry"))["themes"]
test.beforeAll(async () => {
  ;({ themes } = await import("@/themes/registry"))
})

test("every shared theme's fixture renders with zero serious violations", async ({ page }) => {
  for (const key of Object.keys(themes)) {
    const res = await page.goto(`/themes/${key}`)
    expect(res!.status()).toBe(200)
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""))
    expect(serious, `${key} theme: ${serious.map((v) => v.id).join(", ")}`).toHaveLength(0)
  }
})
