import { getTranslations } from "next-intl/server"
import { AppError, type ErrorCode } from "@/platform/errors"
import { log } from "@/platform/log"

/** The serializable result returned by every wrapped server action. */
export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string; field?: string } }

/** Converts typed service errors to localized results and records unexpected failures. */
export function action<Args extends unknown[], Data>(
  handler: (...args: Args) => Promise<Data>
): (...args: Args) => Promise<ActionResult<Data>> {
  return async (...args) => {
    const t = await getTranslations("errors")

    try {
      return { ok: true, data: await handler(...args) }
    } catch (error) {
      if (error instanceof AppError) {
        return {
          ok: false,
          error: {
            code: error.code,
            message: t(error.code),
            ...(error.field ? { field: error.field } : {}),
          },
        }
      }

      log.error("platform.action.failed", { error })
      return { ok: false, error: { code: "internal", message: t("internal") } }
    }
  }
}
