import { describe, expect, it } from "vitest"
import { checkUploadRules } from "@/platform/media/rules"

const rules = { types: ["image/jpeg", "image/png", "image/*"], maxMb: 5 }

describe("checkUploadRules (3.4)", () => {
  it("accepts an allowed type under the limit", () => {
    expect(checkUploadRules(rules, "image/png", 1024)).toEqual({})
  })
  it("rejects a disallowed type", () => {
    expect(checkUploadRules(rules, "application/pdf", 1024)).toEqual({ error: "type" })
    expect(checkUploadRules(rules, "text/html", 1024)).toEqual({ error: "type" })
  })
  it("honours a wildcard prefix", () => {
    expect(checkUploadRules({ types: ["image/*"], maxMb: 5 }, "image/heic", 1024)).toEqual({})
  })
  it("rejects over the limit, zero, and non-finite sizes", () => {
    expect(checkUploadRules(rules, "image/png", 5 * 1024 * 1024 + 1)).toEqual({ error: "size" })
    expect(checkUploadRules(rules, "image/png", 0)).toEqual({ error: "size" })
    expect(checkUploadRules(rules, "image/png", Number.NaN)).toEqual({ error: "size" })
  })
  it("rejects a missing content type", () => {
    expect(checkUploadRules(rules, "", 1024)).toEqual({ error: "content_type" })
  })
})
