/** The quote request form (task 6.6, spec/07): a per-tenant schema-driven
 * definition — never free HTML. `validateFormAnswers` checks every answer
 * against its field type; unknown fields are ignored. */
export type FormField =
  | { key: string; kind: "text"; label: string; required?: boolean }
  | { key: string; kind: "number"; label: string; required?: boolean }
  | { key: string; kind: "select"; label: string; options: string[]; required?: boolean }
  | { key: string; kind: "date"; label: string; required?: boolean }
  | { key: string; kind: "file"; label: string; required?: boolean }

export type FormDefinition = FormField[]

export function validateFormAnswers(
  def: FormDefinition,
  answers: Record<string, unknown>
): { ok: true } | { ok: false; error: string } {
  for (const field of def) {
    const value = answers[field.key]
    const empty = value === undefined || value === null || value === ""
    if (field.required && empty) return { ok: false, error: `${field.key} required` }
    if (empty) continue
    if (field.kind === "number" && typeof value !== "number")
      return { ok: false, error: `${field.key} must be a number` }
    if (field.kind === "text" || field.kind === "date" || field.kind === "file") {
      if (typeof value !== "string") return { ok: false, error: `${field.key} must be a string` }
      if (field.kind === "date" && Number.isNaN(Date.parse(value)))
        return { ok: false, error: `${field.key} must be a date` }
    }
    if (field.kind === "select" && !field.options.includes(value as string)) {
      return { ok: false, error: `${field.key} not an option` }
    }
  }
  return { ok: true }
}

/** A quote totals its lines — same pattern as an order's. */
export function quoteTotal(lines: { quantity: number; unitPriceCents: number }[]): number {
  return lines.reduce((s, l) => s + l.quantity * l.unitPriceCents, 0)
}
