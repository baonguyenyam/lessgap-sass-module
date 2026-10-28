import { describe, expect, it } from "vitest"
import { invitationIdFromPath, invitationIsFor, invitationPath, invitationState, mayGrantRole } from "@/lib/invitations"

const now = new Date("2026-10-28T12:00:00Z")
const later = new Date("2026-11-04T12:00:00Z")
const earlier = new Date("2026-10-27T12:00:00Z")

describe("invitationState", () => {
  it("is pending until it expires, then expired although the status still says pending", () => {
    expect(invitationState({ status: "pending", expiresAt: later }, now)).toBe("pending")
    expect(invitationState({ status: "pending", expiresAt: earlier }, now)).toBe("expired")
    expect(invitationState({ status: "pending", expiresAt: now }, now)).toBe("expired")
  })

  it("keeps accepted and rejected, and reads anything else as canceled", () => {
    expect(invitationState({ status: "accepted", expiresAt: later }, now)).toBe("accepted")
    expect(invitationState({ status: "rejected", expiresAt: later }, now)).toBe("rejected")
    expect(invitationState({ status: "canceled", expiresAt: later }, now)).toBe("canceled")
    expect(invitationState({ status: "whatever", expiresAt: later }, now)).toBe("canceled")
  })
})

describe("invitationIsFor", () => {
  it("compares addresses without case or surrounding spaces", () => {
    expect(invitationIsFor("Ana@Example.com", " ana@example.com")).toBe(true)
    expect(invitationIsFor("ana@example.com", "bob@example.com")).toBe(false)
    expect(invitationIsFor("ana@example.com", null)).toBe(false)
  })
})

describe("invitation paths", () => {
  it("round-trips an id through the invite page path", () => {
    expect(invitationPath("abc_123")).toBe("/invite/abc_123")
    expect(invitationIdFromPath("/invite/abc_123")).toBe("abc_123")
    expect(invitationIdFromPath("/invite/abc_123/")).toBe("abc_123")
  })

  it("reads nothing from other paths or odd ids", () => {
    expect(invitationIdFromPath("/invite")).toBeNull()
    expect(invitationIdFromPath("/invite/a/b")).toBeNull()
    expect(invitationIdFromPath("/invite/<script>")).toBeNull()
    expect(invitationIdFromPath("/dashboard")).toBeNull()
  })
})

describe("mayGrantRole", () => {
  it("lets only an owner make another owner", () => {
    expect(mayGrantRole("owner", "owner")).toBe(true)
    expect(mayGrantRole("manager", "owner")).toBe(false)
    expect(mayGrantRole("front-desk", "owner")).toBe(false)
    expect(mayGrantRole("front-desk", "staff")).toBe(true)
  })
})
