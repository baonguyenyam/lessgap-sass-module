/**
 * A byte count in the largest unit that keeps the number at least 1, for
 * `Intl.NumberFormat`'s `unit` style (`format.number(value, { style: "unit", unit })`).
 * Decimal units (1 kB = 1000 B), as storage providers report them.
 */
export function byteUnit(bytes: number): { value: number; unit: "byte" | "kilobyte" | "megabyte" | "gigabyte" } {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const
  let value = Math.max(0, bytes)
  let i = 0
  while (value >= 1000 && i < units.length - 1) {
    value /= 1000
    i++
  }
  return { value: i === 0 ? value : Math.round(value * 10) / 10, unit: units[i] }
}
