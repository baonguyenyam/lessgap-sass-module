import { describe, expect, it } from "vitest"
import { themes, resolveTheme } from "@/themes/registry"
import { mainTheme } from "@/themes/main"
import { fixtureSite } from "@/themes/main/theme.fixtures"
import { defaultTokens } from "@/themes/main"
import { classicTheme } from "@/themes/classic"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"

/** Task 3.5: every registered theme satisfies the spec/06 theme contract —
 * manifest fields, a token schema its defaults pass, layout + pages +
 * sections, and fixture data for review. */
describe("theme contract", () => {
  it("every theme carries the manifest fields", () => {
    for (const [key, theme] of Object.entries(themes)) {
      expect(theme.key).toBe(key)
      expect(theme.name).toBeTruthy()
      expect(["shared", "custom"]).toContain(theme.kind)
      expect(theme.verticals.length).toBeGreaterThan(0)
    }
  })

  it("every theme's default tokens pass its token schema", () => {
    expect(() => mainTheme.tokenSchema.parse(defaultTokens)).not.toThrow()
  })

  it("every theme has a layout, at least one page, and at least one section", () => {
    for (const theme of Object.values(themes)) {
      expect(typeof theme.layout).toBe("function")
      expect(Object.keys(theme.pages).length).toBeGreaterThan(0)
      expect(Object.keys(theme.sections).length).toBeGreaterThan(0)
      for (const Page of Object.values(theme.pages)) expect(typeof Page).toBe("function")
      for (const Section of Object.values(theme.sections)) expect(typeof Section).toBe("function")
    }
  })

  it("the fixture site's tokens and shape are valid SiteData", () => {
    expect(fixtureSite.site.themeKey).toBe("main")
    expect(fixtureSite.settings.profile.name).toBeTruthy()
    expect(() => mainTheme.tokenSchema.parse(fixtureSite.settings.appearance)).not.toThrow()
  })

  it("both shared themes render the same SiteData fixture (task 4.6)", () => {
    for (const theme of [mainTheme, classicTheme]) {
      const Page = theme.pages["home"] ?? Object.values(theme.pages)[0]
      const Layout = theme.layout
      const html = renderToStaticMarkup(
        createElement(Layout, { data: fixtureSite }, createElement(Page, { data: fixtureSite }))
      )
      // The same fixture produces its name, a service and a staff name in
      // every theme — no theme-specific data path.
      expect(html).toContain("Fixture Co")
      expect(html).toContain("Manicure")
      expect(html).toContain("Mia")
    }
  })

  it("resolveTheme falls back to main for an unknown key", () => {
    expect(resolveTheme("main")).toBe(mainTheme)
    expect(resolveTheme("classic")).toBe(classicTheme)
    expect(resolveTheme("no-such-theme")).toBe(mainTheme)
  })
})
