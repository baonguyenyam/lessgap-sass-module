/** `computeApplicationFee` (task 6.1, spec/05 — every tenant charge asks it).
 * Amounts are integer cents; percentages are basis points. The fee never
 * exceeds the charge and is never negative. `per_booking` is metered
 * billing on the platform invoice — it does not take a cut of the charge,
 * so it returns 0 here and `metered` flags the caller to count it. */
export type FeeModel = {
  model: "none" | "percent" | "fixed" | "percent_fixed" | "per_booking" | "percent_capped"
  /** Basis points — percent, percent_fixed, percent_capped. */
  bps?: number
  /** Constant cents — fixed, percent_fixed. */
  fixed?: number
  /** Cap in cents — percent_capped. */
  cap?: number
}

export type FeeResult = { fee: number; metered: boolean }

export function computeApplicationFee(model: FeeModel, amount: number): FeeResult {
  let fee = 0
  switch (model.model) {
    case "none":
      fee = 0
      break
    case "percent":
      fee = Math.round((amount * (model.bps ?? 0)) / 10_000)
      break
    case "fixed":
      fee = model.fixed ?? 0
      break
    case "percent_fixed":
      fee = Math.round((amount * (model.bps ?? 0)) / 10_000) + (model.fixed ?? 0)
      break
    case "percent_capped": {
      const pct = Math.round((amount * (model.bps ?? 0)) / 10_000)
      fee = model.cap != null ? Math.min(pct, model.cap) : pct
      break
    }
    case "per_booking":
      // Metered on the platform invoice (spec/05) — not a cut of this
      // charge, so the Stripe application fee is 0; the caller counts it.
      return { fee: 0, metered: true }
  }
  return { fee: Math.max(0, Math.min(fee, amount)), metered: false }
}

/** A refund returns the application fee proportionally (spec/05 — by
 * default). `refundAmount` of `amount` refunded → `fee × refund/amount`. */
export function refundFee(fee: number, amount: number, refundAmount: number): number {
  if (amount <= 0 || refundAmount <= 0 || fee <= 0) return 0
  const refunded = Math.round((fee * Math.min(refundAmount, amount)) / amount)
  return Math.max(0, Math.min(refunded, fee))
}
