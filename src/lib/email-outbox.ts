import { db8 } from "@/lib/db8"
import { nowTs } from "@/lib/timestamps"
import type { DeliveryResult } from "@/lib/email-delivery"
import { log } from "@/platform/log"

/**
 * The `EmailMessage` rows (spec/16-operations.md, "Email outbox"), written by
 * `sendEmail()` only: one row opened before the provider is called, settled
 * with the outcome after. Kept apart from `email-delivery.ts`, which the
 * browser bundle reaches through the log masking and must not pull in the
 * database client.
 *
 * A failure to write the record never stops the email: it is logged, and the
 * send goes ahead without a row.
 */

export async function openEmailRecord(email: {
  kind: string
  to: string
  subject: string
  provider: string
  tenantId?: string
}): Promise<string | null> {
  try {
    const row = await db8.orm.public.EmailMessage.create({
      kind: email.kind,
      toAddress: email.to,
      subject: email.subject,
      provider: email.provider,
      tenantId: email.tenantId ?? null,
    })
    return row.id
  } catch (error) {
    await log.error("email.outbox.open_failed", { error, kind: email.kind })
    return null
  }
}

export async function settleEmailRecord(id: string | null, result: DeliveryResult): Promise<void> {
  if (!id) return
  try {
    await db8.orm.public.EmailMessage.where({ id }).update(
      result.status === "SENT"
        ? { status: "SENT", providerMessageId: result.providerMessageId, sentAt: nowTs() }
        : { status: result.status, lastError: result.lastError }
    )
  } catch (error) {
    await log.error("email.outbox.settle_failed", { error })
  }
}
