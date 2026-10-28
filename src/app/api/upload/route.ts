import { NextResponse, type NextRequest } from "next/server"
import { newTimeId } from "@/lib/ids"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { assertUploadAllowed, recordMediaUpload } from "@/platform/media/upload"
import { presignUpload } from "@/platform/storage/r2"
import { AppError } from "@/platform/errors"
import { z } from "zod"

const signSchema = z.object({
  intent: z.literal("sign"),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(3).max(128),
  bytes: z.number().int().positive(),
})
const confirmSchema = z.object({
  intent: z.literal("confirm"),
  key: z.string().min(1).max(512),
  contentType: z.string().min(3).max(128),
  bytes: z.number().int().positive(),
  alt: z.string().max(255).optional(),
})

/**
 * Upload flow (task 3.4): `sign` checks the platform upload rules before the
 * PUT URL exists — an over-limit or disallowed file is refused here. `confirm`
 * is called after the bytes landed — the rules are checked AGAIN (a signed URL
 * proves nothing about what was uploaded), then the `Media` row is written.
 */
export async function POST(req: NextRequest) {
  const ctx = await requireTenantContext("settings", "manage").catch(() => null)
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const body = signSchema.or(confirmSchema).safeParse(await req.json().catch(() => ({})))
  if (!body.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 })
  const input = body.data
  try {
    if (input.intent === "sign") {
      await assertUploadAllowed(input.contentType, input.bytes)
      const key = `media/${ctx.tenantId}/${newTimeId()}-${input.filename.replaceAll("/", "_")}`
      const url = await presignUpload(key, input.contentType)
      return NextResponse.json({ key, url })
    }
    const media = await recordMediaUpload({ tenantId: ctx.tenantId, ...input })
    return NextResponse.json({ id: media.id })
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.code }, { status: 422 })
    throw error
  }
}
