import { maskAddresses } from "@/lib/email-delivery"

/**
 * The Sentry side of `log.error` (ADR 0017). Off unless `SENTRY_DSN` is set,
 * so development and previews work without an account. What reaches Sentry is
 * the error and two tags, never the person: `scrubEvent` is the `beforeSend`
 * of every Sentry config.
 */

type EnvSource = Record<string, string | undefined>

export function sentryEnabled(env: EnvSource = process.env): boolean {
  return Boolean(env.SENTRY_DSN?.trim())
}

/** The tags an event may carry; anything else is dropped. */
const ALLOWED_TAGS = new Set(["requestId", "tenantId", "source", "digest", "runtime"])

type ScrubbableEvent = {
  message?: string
  request?: unknown
  user?: unknown
  breadcrumbs?: unknown
  extra?: unknown
  contexts?: Record<string, unknown>
  tags?: Record<string, unknown>
  exception?: { values?: { type?: string; value?: string }[] }
}

/**
 * `beforeSend`: strips the request (headers, cookies, body), the user, the
 * breadcrumbs and free-form extras; masks addresses in messages; keeps only
 * the allowed tags. Any failure drops the event rather than sending it raw.
 */
export function scrubEvent<E extends ScrubbableEvent>(event: E): E | null {
  try {
    const clean: E = { ...event }
    delete clean.request
    delete clean.user
    delete clean.breadcrumbs
    delete clean.extra
    if (clean.contexts) {
      const { runtime, os, trace } = clean.contexts
      clean.contexts = { runtime, os, trace }
    }
    if (clean.message) clean.message = maskAddresses(clean.message)
    if (clean.exception?.values) {
      clean.exception = {
        ...clean.exception,
        values: clean.exception.values.map((v) => ({ ...v, value: v.value ? maskAddresses(v.value) : v.value })),
      }
    }
    if (clean.tags) {
      clean.tags = Object.fromEntries(Object.entries(clean.tags).filter(([key]) => ALLOWED_TAGS.has(key)))
    }
    return clean
  } catch {
    return null
  }
}

/** Sends a caught error to Sentry with its tags. A no-op when Sentry is off. */
export async function reportToSentry(error: unknown, tags: Record<string, string | null>): Promise<void> {
  if (!sentryEnabled()) return
  const Sentry = await import("@sentry/nextjs")
  Sentry.captureException(error, {
    tags: Object.fromEntries(Object.entries(tags).filter((entry): entry is [string, string] => entry[1] !== null)),
  })
}
