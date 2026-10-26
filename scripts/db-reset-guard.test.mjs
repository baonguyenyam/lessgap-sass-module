import { describe, expect, it } from "vitest"

import { checkResetTarget, isLocalHost, parseAllowHosts } from "./db-reset-guard.mjs"

const NEON = "postgresql://user:secret@ep-old-rain-b5v5edey-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require"

describe("isLocalHost", () => {
  it.each(["localhost", "127.0.0.1", "::1", "db", "postgres", "app.localhost", "LOCALHOST"])(
    "treats %s as local",
    (host) => {
      expect(isLocalHost(host)).toBe(true)
    },
  )

  it.each(["ep-old-rain.neon.tech", "localhost.example.com", "db.example.com"])("treats %s as remote", (host) => {
    expect(isLocalHost(host)).toBe(false)
  })
})

describe("parseAllowHosts", () => {
  it("splits, trims, lowercases and drops blanks", () => {
    expect(parseAllowHosts(" EP-A , ,ep-b ")).toEqual(["ep-a", "ep-b"])
    expect(parseAllowHosts(undefined)).toEqual([])
  })
})

describe("checkResetTarget", () => {
  it("allows a local database and names it", () => {
    expect(checkResetTarget({ url: "postgresql://u:p@localhost:5432/lessgap", env: {} })).toEqual({
      ok: true,
      host: "localhost",
      database: "lessgap",
    })
  })

  it("refuses in production even for a local host", () => {
    const result = checkResetTarget({ url: "postgresql://u:p@localhost/x", env: { NODE_ENV: "production" } })
    expect(result.ok).toBe(false)
  })

  it("refuses on a Vercel production deployment", () => {
    const result = checkResetTarget({ url: "postgresql://u:p@localhost/x", env: { VERCEL_ENV: "production" } })
    expect(result.ok).toBe(false)
  })

  it("refuses a remote host that is not allow-listed, and says how to allow it", () => {
    const result = checkResetTarget({ url: NEON, env: {} })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain("DB_RESET_ALLOW_HOSTS")
  })

  it("allows a remote host whose Neon endpoint id is allow-listed, pooled or direct", () => {
    const env = { DB_RESET_ALLOW_HOSTS: "ep-old-rain-b5v5edey" }
    expect(checkResetTarget({ url: NEON, env }).ok).toBe(true)
    expect(checkResetTarget({ url: NEON.replace("-pooler", ""), env }).ok).toBe(true)
  })

  it("does not let a short allow-list entry match an unrelated host by accident", () => {
    const env = { DB_RESET_ALLOW_HOSTS: "ep-old-rain-b5v5edey" }
    const other = NEON.replace("ep-old-rain-b5v5edey", "ep-new-sun-a1b2c3d4")
    expect(checkResetTarget({ url: other, env }).ok).toBe(false)
  })

  it("refuses a missing, malformed or non-PostgreSQL URL", () => {
    expect(checkResetTarget({ url: undefined, env: {} }).ok).toBe(false)
    expect(checkResetTarget({ url: "not a url", env: {} }).ok).toBe(false)
    expect(checkResetTarget({ url: "mysql://u:p@localhost/x", env: {} }).ok).toBe(false)
  })
})
