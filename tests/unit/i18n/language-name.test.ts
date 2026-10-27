import { describe, expect, it } from "vitest"

import { languageName } from "@/i18n/language-name"

describe("languageName", () => {
  it("names each locale in itself, capitalised for a list", () => {
    expect(languageName("en")).toBe("English")
    expect(languageName("vi")).toBe("Tiếng Việt")
  })

  it("falls back to the code for something that is not a language tag", () => {
    expect(languageName("not a locale")).toBe("not a locale")
  })
})
