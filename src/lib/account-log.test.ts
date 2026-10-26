import { describe, expect, it } from "vitest"

import { buildAccountLog, type AccountLogInput } from "./account-log"

const at = (iso: string) => new Date(iso)

const base: AccountLogInput = {
  createdAt: at("2026-01-01T10:00:00Z"),
  accounts: [{ providerId: "credential", createdAt: at("2026-01-01T10:00:01Z") }],
  twoFactorSince: null,
  sessions: [],
  currentSessionId: null,
  now: at("2026-06-01T00:00:00Z"),
}

describe("buildAccountLog", () => {
  it("lists every event newest first", () => {
    const log = buildAccountLog({
      ...base,
      accounts: [...base.accounts, { providerId: "google", createdAt: at("2026-03-01T00:00:00Z") }],
      twoFactorSince: at("2026-02-01T00:00:00Z"),
    })
    expect(log.map((e) => e.kind)).toEqual(["method-added", "two-factor-enabled", "method-added", "account-created"])
  })

  it("marks sessions as active, current, or opened with Switch As", () => {
    const log = buildAccountLog({
      ...base,
      sessions: [
        { id: "s1", createdAt: at("2026-05-01T00:00:00Z"), expiresAt: at("2026-07-01T00:00:00Z"), userAgent: "UA", ipAddress: "1.2.3.4", switchedBy: null },
        { id: "s2", createdAt: at("2026-04-01T00:00:00Z"), expiresAt: at("2026-04-08T00:00:00Z"), userAgent: null, ipAddress: null, switchedBy: "root-1" },
      ],
      currentSessionId: "s1",
    })
    expect(log[0]).toMatchObject({ kind: "signed-in", active: true, current: true, switched: false, ipAddress: "1.2.3.4" })
    expect(log[1]).toMatchObject({ kind: "signed-in", active: false, current: false, switched: true })
  })

  it("leaves two-factor out when it is off", () => {
    expect(buildAccountLog(base).some((e) => e.kind === "two-factor-enabled")).toBe(false)
  })
})
