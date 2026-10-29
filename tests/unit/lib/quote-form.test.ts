import { describe, expect, it } from "vitest"
import { validateFormAnswers, quoteTotal, type FormDefinition } from "@/lib/quotes/form"

const def: FormDefinition = [
  { key: "size", kind: "number", label: "Rooms", required: true },
  { key: "date", kind: "date", label: "When" },
  { key: "kind", kind: "select", label: "Type", options: ["deep", "regular"], required: true },
  { key: "notes", kind: "text", label: "Notes" },
]

describe("validateFormAnswers (6.6)", () => {
  it("accepts a valid answer set", () => {
    expect(validateFormAnswers(def, { size: 2, kind: "deep", date: "2026-11-01" }).ok).toBe(true)
  })
  it("rejects a missing required field and a wrong type", () => {
    expect(validateFormAnswers(def, { kind: "deep" }).ok).toBe(false)
    expect(validateFormAnswers(def, { size: "two", kind: "deep" }).ok).toBe(false)
  })
  it("rejects a select answer not in options and a bad date", () => {
    expect(validateFormAnswers(def, { size: 2, kind: "other" }).ok).toBe(false)
    expect(validateFormAnswers(def, { size: 2, kind: "deep", date: "not-a-date" }).ok).toBe(false)
  })
  it("ignores unknown fields", () => {
    expect(validateFormAnswers(def, { size: 2, kind: "deep", unknown: "x" }).ok).toBe(true)
  })
})

describe("quoteTotal (6.6)", () => {
  it("sums quantity × unit price", () => {
    expect(
      quoteTotal([
        { quantity: 2, unitPriceCents: 500 },
        { quantity: 1, unitPriceCents: 300 },
      ])
    ).toBe(1300)
    expect(quoteTotal([])).toBe(0)
  })
})
