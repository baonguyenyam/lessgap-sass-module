import { db8 } from "@/lib/db8"
import { newTimeId } from "@/lib/ids"
import { toTs } from "@/lib/timestamps"
import { AppError } from "@/platform/errors"
import { getEntitlements } from "./index"
import { FEATURES, type FeatureDefinition, type LimitFeature } from "./registry"

type Tx = Parameters<Parameters<typeof db8.transaction>[0]>[0]

/** First instant of the current UTC month, the period bucket for "month". */
export function periodStartFor(period: string): string {
  if (period !== "month") throw new AppError("internal", { cause: `unknown metered period ${period}` })
  const now = new Date()
  return toTs(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)))
}

/**
 * Takes `n` units of a metered limit (spec/04-entitlements.md). Pass the
 * transaction of the guarded write so the two commit or roll back together —
 * the conditional `used + n <= limit` is what stops two requests both taking
 * the last unit. `null` (unlimited) consumes nothing; `0` or over the limit
 * throws `limit_reached`.
 */
export async function consumeLimit(ctx: { tenantId: string }, key: LimitFeature, n: number, tx?: Tx): Promise<void> {
  const definition = FEATURES[key] as FeatureDefinition | undefined
  const period = definition?.kind === "limit" ? definition.period : undefined
  if (!period) throw new AppError("internal", { cause: `limit ${key} is not metered` })

  const limit = (await getEntitlements(ctx)).limit(key)
  if (limit === null) return
  if (n <= 0 || n > limit) throw new AppError("limit_reached")

  const periodStart = periodStartFor(period)
  const db = tx ?? db8
  const stats = await db.execute(
    db.raw.sql`
      INSERT INTO "UsageCounter" ("id", "tenantId", "limitKey", "periodStart", "used")
      VALUES (${newTimeId()}, ${ctx.tenantId}, ${key}, ${periodStart}, ${n})
      ON CONFLICT ("tenantId", "limitKey", "periodStart")
      DO UPDATE SET "used" = "UsageCounter"."used" + ${n}
      WHERE "UsageCounter"."used" + ${n} <= ${limit}
    `
      .affectedCount()
      .build()
  )
  if (stats.affectedRows === 0) throw new AppError("limit_reached")
}
