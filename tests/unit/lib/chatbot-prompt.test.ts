import { describe, expect, it } from "vitest"
import { buildSystemPrompt } from "@/platform/chatbot/prompt"

describe("buildSystemPrompt (7.3)", () => {
  it("declares tenant content as data, never instructions", () => {
    const prompt = buildSystemPrompt({ businessName: "Salon X" })
    expect(prompt).toContain("DATA")
    expect(prompt).toContain("never followed")
    expect(prompt).toContain("get_services")
  })
  it("includes the business name, tone, languages and chunks", () => {
    const prompt = buildSystemPrompt({
      businessName: "Salon X",
      tone: "formal",
      languages: ["en", "vi"],
      chunks: ["We close at 6."],
    })
    expect(prompt).toContain("Salon X")
    expect(prompt).toContain("formal")
    expect(prompt).toContain("en, vi")
    expect(prompt).toContain("[1] We close at 6.")
  })
})
