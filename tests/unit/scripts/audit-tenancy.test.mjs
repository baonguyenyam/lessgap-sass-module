import { describe, expect, it } from "vitest"

import { findUnclassifiedModels } from "#scripts/audit-tenancy.mjs"

describe("findUnclassifiedModels", () => {
  it("finds a model missing from the tenancy classification", () => {
    const fixtureContract = {
      roots: {
        User: { model: "User", namespace: "public" },
        UnclassifiedRecord: { model: "UnclassifiedRecord", namespace: "public" },
      },
    }

    expect(findUnclassifiedModels(fixtureContract, { User: { kind: "identity", reason: "Fixture." } })).toEqual([
      "UnclassifiedRecord",
    ])
  })

  it("accepts a contract when every model has a classification", () => {
    const fixtureContract = {
      roots: {
        User: { model: "User", namespace: "public" },
      },
    }

    expect(findUnclassifiedModels(fixtureContract, { User: { kind: "identity", reason: "Fixture." } })).toEqual([])
  })
})
