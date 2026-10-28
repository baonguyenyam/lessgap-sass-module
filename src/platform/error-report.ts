import { createHash } from "node:crypto"
import { maskAddresses } from "@/lib/email-delivery"
import { newTimeId } from "@/lib/ids"
import type { ErrorSource } from "@/platform/request-context"

/**
 * One `ErrorReport` row per digest (spec/16-operations.md, ADR 0017): the
 * digest is a hash of the surface, the error name and the first stack frame,
 * so the same bug thrown from the same place counts up one row instead of
 * filling the table. The message is masked like every log line.
 */

export type ErrorReportRecord = {
  digest: string
  source: ErrorSource
  name: string
  message: string
  requestId: string | null
  tenantId: string | null
}

const MAX_MESSAGE = 1000

/** The first `at …` line of a stack, without the column, so a rebuild with shifted columns keeps the digest. */
export function firstStackFrame(stack: string | undefined): string {
  const line = stack
    ?.split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("at "))
  return line ? line.replace(/:\d+\)?$/, "") : ""
}

export function errorDigest(source: string, name: string, frame: string): string {
  return createHash("sha256").update(`${source}\n${name}\n${frame}`).digest("hex").slice(0, 32)
}

/** Name, masked message and stack of anything thrown. */
export function describeError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return { name: error.name, message: maskAddresses(error.message).slice(0, MAX_MESSAGE), stack: error.stack }
  }
  return { name: "NonError", message: maskAddresses(String(error)).slice(0, MAX_MESSAGE) }
}

export function buildErrorReport(input: {
  error: unknown
  event: string
  source: ErrorSource
  requestId?: string | null
  tenantId?: string | null
}): ErrorReportRecord {
  const { name, message, stack } = describeError(input.error ?? input.event)
  // Without a stack (a value thrown, or no error at all) the event name is
  // what places it.
  const frame = firstStackFrame(stack) || input.event
  return {
    digest: errorDigest(input.source, name, frame),
    source: input.source,
    name,
    message: message || input.event,
    requestId: input.requestId ?? null,
    tenantId: input.tenantId ?? null,
  }
}

/**
 * Inserts the group, or counts one more occurrence; a recurrence reopens a
 * resolved group. The raw lane infers a codec from each value and has none for
 * `null`, so a missing id travels as "" and becomes NULL in SQL.
 */
export async function writeErrorReport(report: ErrorReportRecord): Promise<void> {
  const { db8 } = await import("@/lib/db8")
  const plan = db8.raw.sql`
    INSERT INTO "ErrorReport" ("id", "digest", "source", "name", "message", "requestId", "tenantId")
    VALUES (${newTimeId()}, ${report.digest}, ${report.source}, ${report.name}, ${report.message},
            NULLIF(${report.requestId ?? ""}, ''), NULLIF(${report.tenantId ?? ""}, ''))
    ON CONFLICT ("digest") DO UPDATE SET
      "count" = "ErrorReport"."count" + 1,
      "lastSeenAt" = now(),
      "message" = EXCLUDED."message",
      "requestId" = EXCLUDED."requestId",
      "tenantId" = COALESCE(EXCLUDED."tenantId", "ErrorReport"."tenantId"),
      "resolvedAt" = NULL
  `
    .affectedCount()
    .build()
  await db8.execute(plan)
}
