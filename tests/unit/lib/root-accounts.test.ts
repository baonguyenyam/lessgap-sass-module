import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { grantRootFromConfig, parseRootEmails } = await import("@/lib/root-accounts")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

beforeEach(() => db.reset())

describe("parseRootEmails", () => {
  it("splits, trims, lowercases and de-duplicates", () => {
    expect(parseRootEmails(" Root@Example.com, ,other@example.com,root@example.com ")).toEqual([
      "root@example.com",
      "other@example.com",
    ])
  })

  it("is empty when the variable is unset or blank", () => {
    expect(parseRootEmails(undefined)).toEqual([])
    expect(parseRootEmails("  ")).toEqual([])
  })
})

describe("grantRootFromConfig", () => {
  it("promotes the listed users that are not ROOT yet", async () => {
    db.fn("User.updateAndCount").mockResolvedValue(1)
    await expect(grantRootFromConfig({ ROOT_EMAILS: "Root@example.com" })).resolves.toBe(1)
    expect(db.call("User.updateAndCount")?.args).toEqual([{ role: "ROOT" }])
  })

  it("touches nothing when no address is configured", async () => {
    await expect(grantRootFromConfig({})).resolves.toBe(0)
    expect(db.calls).toEqual([])
  })
})
