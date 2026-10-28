import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"
import { AppError } from "@/platform/errors"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}))
vi.mock("@/platform/staff", () => ({
  requirePlatformRole: async () => ({ user: { id: "staff1" }, platformRole: "ADMIN" }),
}))

const { assertUploadAllowed, recordMediaUpload } = await import("@/platform/media/upload")

describe("upload rules (3.4)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("a console edit takes effect on the next assertUploadAllowed", async () => {
    // Default: 10MB, images only.
    await expect(assertUploadAllowed("image/png", 2 * 1024 * 1024)).resolves.toBeUndefined()
    await expect(assertUploadAllowed("application/pdf", 1024)).rejects.toBeInstanceOf(AppError)

    // The console writes a PlatformSwitch row — the next read sees the limit.
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key: "upload.max_mb" },
      create: { key: "upload.max_mb", value: 1, updatedById: "test" },
      update: { value: 1 },
    })
    await expect(assertUploadAllowed("image/png", 2 * 1024 * 1024)).rejects.toBeInstanceOf(AppError)
    await expect(assertUploadAllowed("image/png", 1024)).resolves.toBeUndefined()
  })

  it("recordMediaUpload re-checks the rules and writes the Media row", async () => {
    const { user } = await auth.api.signUpEmail({
      body: { email: `media-${Date.now()}@example.test`, password: "correct horse battery staple", name: "M" },
    })
    const tenant = await auth.api.createOrganization({
      body: { name: "MediaCo", slug: `media-${Date.now()}`, userId: user.id },
    })
    await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
    const media = await recordMediaUpload({
      tenantId: tenant.id,
      key: `media/${tenant.id}/logo.png`,
      contentType: "image/png",
      bytes: 2048,
      alt: "Logo",
    })
    expect(media.tenantId).toBe(tenant.id)
    await expect(
      recordMediaUpload({
        tenantId: tenant.id,
        key: `media/${tenant.id}/bad.pdf`,
        contentType: "application/pdf",
        bytes: 2048,
      })
    ).rejects.toBeInstanceOf(AppError)
  })
})
