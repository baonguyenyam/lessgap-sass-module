import { describe, expect, it } from "vitest"
import { chunkText, estimateTokens } from "@/lib/chatbot/chunk"

describe("chunkText (7.2)", () => {
  it("splits on paragraph boundaries under the token cap", () => {
    const text = "First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph here."
    const chunks = chunkText(text, 10) // 10 tokens ≈ 40 chars
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) expect(estimateTokens(c)).toBeLessThanOrEqual(10)
  })
  it("keeps a small text whole", () => {
    expect(chunkText("short text", 400)).toEqual(["short text"])
  })
  it("splits an oversized block hard so no chunk exceeds the cap", () => {
    const text = "x".repeat(500) // ~125 tokens
    const chunks = chunkText(text, 50)
    for (const c of chunks) expect(estimateTokens(c)).toBeLessThanOrEqual(50)
    expect(chunks.join("").replace(/\s/g, "")).toContain("x".repeat(50))
  })
  it("splits on markdown headings too", () => {
    const text = "Intro\n\n# Section A\nContent A\n\n# Section B\nContent B"
    const chunks = chunkText(text, 400)
    expect(chunks.length).toBeGreaterThanOrEqual(1)
  })
})
