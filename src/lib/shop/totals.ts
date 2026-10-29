/** Cart totals (task 6.4): one pure function — a cart's cents is the sum
 * of variant price × quantity. Shipping adds its flat rate when the tenant
 * set one and the order isn't pickup. */
export function cartTotal(lines: { quantity: number; unitPriceCents: number }[]): number {
  return lines.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0)
}
export function orderTotal(subtotalCents: number, fulfilment: string, shippingFlatCents: number | null): number {
  return subtotalCents + (fulfilment === "shipping" ? (shippingFlatCents ?? 0) : 0)
}
