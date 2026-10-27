/** Money is stored as integer minor units with an ISO 4217 currency code. */
export type Money = { amount: number; currency: string }

function assertMinorUnits(amount: number): void {
  if (!Number.isSafeInteger(amount)) throw new RangeError("Amount must be safe integer minor units")
}

/** Formats integer minor units at the display boundary for the requested locale. */
export function formatMoney(amount: number, currency: string, locale: string): string {
  assertMinorUnits(amount)
  const formatter = new Intl.NumberFormat(locale, { style: "currency", currency })
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2
  return formatter.format(amount / 10 ** fractionDigits)
}

/** Adds amounts only when both values use the same currency. */
export function addMoney(left: Money, right: Money): Money {
  assertMinorUnits(left.amount)
  assertMinorUnits(right.amount)
  if (left.currency !== right.currency) throw new RangeError("Currency codes must match")

  const amount = left.amount + right.amount
  assertMinorUnits(amount)
  return { amount, currency: left.currency }
}
