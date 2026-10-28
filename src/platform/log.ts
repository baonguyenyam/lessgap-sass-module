import { maskAddresses } from "@/lib/email-delivery"
import { isErrorSource, REQUEST_ID_HEADER, REQUEST_SOURCE_HEADER, type ErrorSource } from "@/platform/request-context"

type LogFields = Record<string, unknown>

const PRIVATE_FIELD = /authorization|cookie|email|message|password|secret|token|body/i

function scrub(value: unknown, key = ""): unknown {
  if (PRIVATE_FIELD.test(key)) return "[redacted]"
  if (typeof value === "string") return maskAddresses(value)
  if (value instanceof Error) return { name: value.name, message: maskAddresses(value.message) }
  if (Array.isArray(value)) return value.map((item) => scrub(item))
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, scrub(item, name)]))
  }
  return value
}

function write(level: "info" | "error", event: string, fields: LogFields): void {
  const record = JSON.stringify({ level, event, ...(scrub(fields) as LogFields) })
  if (level === "error") console.error(record)
  else console.info(record)
}

/**
 * The request id and surface the proxy stamped (`src/proxy.ts`), or nulls
 * outside a request (a job, a script, a test).
 */
export async function requestContext(): Promise<{ requestId: string | null; source: ErrorSource | null }> {
  try {
    const { headers } = await import("next/headers")
    const h = await headers()
    const source = h.get(REQUEST_SOURCE_HEADER)
    return { requestId: h.get(REQUEST_ID_HEADER), source: isErrorSource(source) ? source : null }
  } catch {
    return { requestId: null, source: null }
  }
}

/**
 * The two sinks of `log.error` (spec/16-operations.md): an `ErrorReport` row,
 * always, and Sentry when it is configured. Neither may break the caller, so a
 * failing sink logs one line and is otherwise ignored.
 */
async function report(event: string, fields: LogFields): Promise<void> {
  const context = await requestContext()
  const requestId = typeof fields.requestId === "string" ? fields.requestId : context.requestId
  const source: ErrorSource = isErrorSource(fields.source) ? fields.source : (context.source ?? "api")
  const tenantId = typeof fields.tenantId === "string" ? fields.tenantId : null
  const { buildErrorReport, writeErrorReport } = await import("@/platform/error-report")
  const record = buildErrorReport({ error: fields.error, event, source, requestId, tenantId })
  const { reportToSentry } = await import("@/platform/sentry")
  const results = await Promise.allSettled([
    writeErrorReport(record),
    reportToSentry(fields.error ?? new Error(event), { requestId, tenantId, source, digest: record.digest }),
  ])
  for (const result of results) {
    if (result.status === "rejected") write("error", "platform.log.sink_failed", { error: result.reason })
  }
}

/** Structured logger that masks email addresses and removes sensitive fields. */
export const log = {
  info(event: string, fields: LogFields = {}): void {
    write("info", event, fields)
  },
  /**
   * Writes the line at once, then records the error (`ErrorReport`, Sentry).
   * Await it when the process may end right after (a job, a route handler
   * that returns); a request that keeps running can leave it.
   */
  error(event: string, fields: LogFields = {}): Promise<void> {
    write("error", event, fields)
    return report(event, fields)
  },
}
