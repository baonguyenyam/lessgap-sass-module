import { describe, expect, it } from "vitest"

import { pendingMigrations, type MigrationEdge } from "./migration-chain"

const EDGES: MigrationEdge[] = [
  { name: "20260101T0000_kit_baseline", from: null, to: "h1" },
  { name: "20260201T0000_second", from: "h1", to: "h2" },
  { name: "20260301T0000_third", from: "h2", to: "h3" },
]

const names = (edges: MigrationEdge[] | null) => edges?.map((edge) => edge.name) ?? null

describe("pendingMigrations", () => {
  it("is empty when the database is at the contract", () => {
    expect(pendingMigrations(EDGES, "h3", "h3")).toEqual([])
  })

  it("lists what is left, oldest first", () => {
    expect(names(pendingMigrations(EDGES, "h1", "h3"))).toEqual(["20260201T0000_second", "20260301T0000_third"])
  })

  it("starts from the baseline on a database that was never migrated", () => {
    expect(pendingMigrations(EDGES, null, "h3")).toHaveLength(3)
  })

  it("says unknown when the database is on no path to the contract", () => {
    expect(pendingMigrations(EDGES, "elsewhere", "h3")).toBeNull()
  })

  it("says unknown when no migration reaches the contract", () => {
    expect(pendingMigrations(EDGES, "h3", "unplanned")).toBeNull()
  })

  it("does not loop on a graph with a cycle", () => {
    const cyclic: MigrationEdge[] = [
      { name: "a", from: "h2", to: "h1" },
      { name: "b", from: "h1", to: "h2" },
    ]
    expect(pendingMigrations(cyclic, "elsewhere", "h2")).toBeNull()
  })
})
