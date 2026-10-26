import { describe, expect, it, vi } from "vitest"

import { grantRootFromConfig, parseRootEmails } from "./root-accounts"

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
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const prisma = { user: { updateMany } } as never
    await expect(grantRootFromConfig(prisma, { ROOT_EMAILS: "Root@example.com" })).resolves.toBe(1)
    expect(updateMany).toHaveBeenCalledWith({
      where: { email: { in: ["root@example.com"] }, role: { not: "ROOT" } },
      data: { role: "ROOT" },
    })
  })

  it("touches nothing when no address is configured", async () => {
    const updateMany = vi.fn()
    await expect(grantRootFromConfig({ user: { updateMany } } as never, {})).resolves.toBe(0)
    expect(updateMany).not.toHaveBeenCalled()
  })
})
