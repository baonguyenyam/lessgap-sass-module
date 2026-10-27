/** Error codes shared by platform services, actions and route handlers. */
export const ERROR_CODES = [
  "unauthorized",
  "forbidden",
  "not_found",
  "invalid_input",
  "conflict",
  "limit_reached",
  "feature_unavailable",
  "module_inactive",
  "rate_limited",
  "payment_required",
  "internal",
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

/** A safe, typed error that can cross a service boundary into an action result. */
export class AppError extends Error {
  readonly code: ErrorCode
  readonly field?: string

  constructor(code: ErrorCode, options: { field?: string; cause?: unknown } = {}) {
    super(code, { cause: options.cause })
    this.name = "AppError"
    this.code = code
    this.field = options.field
  }
}
