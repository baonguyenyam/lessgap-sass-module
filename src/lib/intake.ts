/**
 * Intake answers validation (task 15.1, ADR 0028 — contact-only): a form's
 * `fields` is a Json array of { label, kind: "text"|"checkbox"|"email"|"phone",
 * required } — the server re-checks what the browser checked.
 */
export type IntakeField = { label: string; kind: string; required?: boolean }

export function intakeAnswerError(fields: unknown, answers: Record<string, string | boolean>): string | null {
  if (!Array.isArray(fields)) return "invalid_fields"
  for (const f of fields as IntakeField[]) {
    if (!f || typeof f.label !== "string" || typeof f.kind !== "string") return "invalid_fields"
    if (f.required && !answers[f.label]) return `required:${f.label}`
  }
  return null
}
