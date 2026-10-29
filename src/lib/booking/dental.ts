/** The dental vertical's PHI rule (task 5.9, spec/10): a dental booking
 * collects name, contact and a preferred time — never clinical details.
 * The `notes` field is the only free-text slot that could carry PHI, so the
 * server refuses it outright on dental tenants; the site form's label says
 * the same to the visitor. */
export function bookingInputError(input: { notes?: string }, verticalKey: string): string | null {
  if (verticalKey === "dental" && input.notes != null && input.notes.trim() !== "") return "invalid_input"
  return null
}
