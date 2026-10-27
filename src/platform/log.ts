import { maskAddresses } from "@/lib/email-delivery"

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

/** Structured logger that masks email addresses and removes sensitive fields. */
export const log = {
  info(event: string, fields: LogFields = {}): void {
    write("info", event, fields)
  },
  error(event: string, fields: LogFields = {}): void {
    write("error", event, fields)
  },
}
