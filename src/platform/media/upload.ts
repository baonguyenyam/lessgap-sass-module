import { db8 } from "@/lib/db8"
import { getPlatformSettings } from "@/platform/settings/store"
import { checkUploadRules, type UploadRules } from "@/platform/media/rules"
import { AppError } from "@/platform/errors"

/**
 * The upload rules as currently set (task 3.4) — read live so a console edit
 * takes effect on the next upload.
 */
export async function uploadRules(): Promise<UploadRules> {
  const s = await getPlatformSettings()
  return {
    types: s["upload.types"].map((t) => t.trim().toLowerCase()).filter(Boolean),
    maxMb: s["upload.max_mb"],
  }
}

/** Called both before a signed upload URL is issued and after the bytes
 * arrive — a rule breach throws `invalid_input` either way. */
export async function assertUploadAllowed(contentType: string, bytes: number): Promise<void> {
  const rules = await uploadRules()
  const { error } = checkUploadRules(rules, contentType, bytes)
  if (error) throw new AppError("invalid_input", { field: error })
}

/** After an upload completes: re-check the rules, then record the Media row
 * the site and the media library read. */
export async function recordMediaUpload(input: {
  tenantId: string
  key: string
  contentType: string
  bytes: number
  alt?: string
}) {
  await assertUploadAllowed(input.contentType, input.bytes)
  return db8.orm.public.Media.create({
    tenantId: input.tenantId,
    key: input.key,
    contentType: input.contentType,
    bytes: input.bytes,
    alt: input.alt ?? null,
  })
}
