import { describe, expect, it } from "vitest"

import { accountExportFileName, buildAccountExport, type AccountExportInput } from "@/lib/account-export"

const TS = "2026-10-26 19:15:31.288"

const input: AccountExportInput = {
  user: {
    id: "u1",
    email: "ada@example.com",
    name: "Ada",
    image: null,
    role: "USER",
    emailVerified: true,
    twoFactorEnabled: true,
    createdAt: TS,
    updatedAt: TS,
  },
  accounts: [{ providerId: "credential", createdAt: TS }],
  sessions: [{ createdAt: TS, expiresAt: TS, ipAddress: "1.2.3.4", userAgent: "UA" }],
  projects: [{ id: "p1", name: "Site", description: null, createdAt: TS, updatedAt: TS }],
  subscription: {
    status: "ACTIVE",
    currentPeriodStart: TS,
    currentPeriodEnd: TS,
    cancelAtPeriodEnd: false,
    trialEndsAt: null,
    createdAt: TS,
    plan: { name: "Pro" },
  },
  purchases: [],
  newsletter: null,
}

describe("buildAccountExport", () => {
  const exportedAt = new Date("2026-10-26T20:00:00Z")

  it("writes dates as UTC ISO strings", () => {
    const file = buildAccountExport(input, exportedAt)
    expect(file.profile.createdAt).toBe("2026-10-26T19:15:31.288Z")
    expect(file.subscription?.trialEndsAt).toBeNull()
    expect(file.exportedAt).toBe("2026-10-26T20:00:00.000Z")
  })

  /**
   * The point of the allow-list. Rows arrive with every column the query
   * selected; a secret passed in by mistake must still not reach the file.
   */
  it("never carries a credential, even one passed in by mistake", () => {
    const leaky = {
      ...input,
      user: { ...input.user, passwordHash: "x" },
      accounts: [{ providerId: "google", createdAt: TS, accessToken: "x", refreshToken: "x", password: "x" }],
      sessions: [{ ...input.sessions[0], token: "x" }],
    } as unknown as AccountExportInput
    const json = JSON.stringify(buildAccountExport(leaky, exportedAt))
    for (const key of ["password", "token", "Token", "secret", "backupCodes", "stripeCustomerId"]) {
      expect(json).not.toContain(key)
    }
  })
})

describe("accountExportFileName", () => {
  it("names the file after the day, not the person", () => {
    expect(accountExportFileName(new Date("2026-10-26T23:59:00Z"))).toBe("account-export-2026-10-26.json")
  })
})
