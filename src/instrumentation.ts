import type { Instrumentation } from "next"

/**
 * Runs once when the server starts, before it serves anything.
 *
 * A misconfigured deployment should announce itself here, in the boot logs,
 * rather than three days later when the first customer tries to pay. The check
 * is skipped on the edge runtime, which has no access to the server-only
 * variables in the first place. Sentry starts here too, when it is configured
 * (ADR 0017).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env")
    validateEnv()
  }

  if (!process.env.SENTRY_DSN?.trim()) return
  if (process.env.NEXT_RUNTIME === "nodejs") await import("@/sentry.server.config")
  if (process.env.NEXT_RUNTIME === "edge") await import("@/sentry.edge.config")
}

/**
 * Errors nobody caught (a page, a route handler, an action that threw) take
 * the same path as a caught one: `log.error`, which writes the `ErrorReport`
 * row and reports to Sentry once. The request id comes from the header the
 * proxy stamped.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const header = (name: string) => {
    const value = request.headers[name]
    return Array.isArray(value) ? value[0] : value
  }
  const { log } = await import("@/platform/log")
  await log.error("platform.request.failed", {
    error,
    requestId: header("x-request-id"),
    source: header("x-request-source"),
    routeType: context.routeType,
  })
}
