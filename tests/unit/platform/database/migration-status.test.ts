import { describe, expect, it } from "vitest"

import { describeMigration, migrationStatus } from "@/platform/database/migration-status"

const edges = [
  { name: "20261026T1841_kit_baseline", from: null, to: "a" },
  { name: "20261027T1727_kit_member_status", from: "a", to: "b" },
  { name: "20261027T1800_platform_jobs", from: "b", to: "c" },
]

describe("migrationStatus", () => {
  it("is current when the marker is the contract", () => {
    expect(migrationStatus(edges, "c", "c")).toEqual({ state: "current" })
  })

  it("lists what is left, oldest first", () => {
    expect(migrationStatus(edges, "a", "c")).toEqual({
      state: "behind",
      pending: ["20261027T1727_kit_member_status", "20261027T1800_platform_jobs"],
    })
  })

  it("lists every migration for a database never migrated", () => {
    expect(migrationStatus(edges, null, "c")).toMatchObject({ state: "behind", pending: { length: 3 } })
  })

  it("says unknown when the marker is on no path to the contract", () => {
    expect(migrationStatus(edges, "zzz", "c")).toEqual({ state: "unknown", marker: "zzz" })
  })
})

describe("describeMigration", () => {
  it("splits the date from the words", () => {
    expect(describeMigration("20261027T1727_kit_member_status")).toEqual({
      label: "kit member status",
      date: "2026-10-27",
    })
  })

  it("keeps a name it does not recognise", () => {
    expect(describeMigration("custom")).toEqual({ label: "custom", date: null })
  })
})
