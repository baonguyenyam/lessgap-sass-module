import { describe, expect, it } from "vitest"

import { PLATFORM_SETTINGS_TAG, tenantSettingsTag, userSettingsTag } from "@/platform/settings/cache-tags"

describe("settings cache tags", () => {
  it("keys tenant and person tags by their id", () => {
    expect(tenantSettingsTag("t1")).toBe("tenant-settings:t1")
    expect(userSettingsTag("u1")).toBe("user-settings:u1")
  })

  it("never gives two tenants, or a tenant and a person, the same tag", () => {
    const tags = [PLATFORM_SETTINGS_TAG, tenantSettingsTag("a"), tenantSettingsTag("b"), userSettingsTag("a")]
    expect(new Set(tags).size).toBe(tags.length)
  })
})
