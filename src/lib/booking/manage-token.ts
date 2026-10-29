import { createHmac, timingSafeEqual } from "crypto"

/** The manage link (task 5.4, spec/07): a booking confirmation carries a
 * signed token a customer uses to reschedule or cancel — HMAC over the
 * appointment id so the link cannot be forged. */
const secret = () => process.env.AUTH_SECRET ?? process.env.MANAGE_TOKEN_SECRET ?? "dev-manage-secret"

export function signManageToken(appointmentId: string, expiresAt?: number): string {
  const exp = expiresAt ?? Date.now() + 30 * 24 * 3600 * 1000
  const payload = `${appointmentId}.${exp}`
  const sig = createHmac("sha256", secret()).update(payload).digest("hex")
  return `${payload}.${sig}`
}

export function verifyManageToken(token: string): { appointmentId: string } | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [appointmentId, exp, sig] = parts
  if (Number(exp) < Date.now()) return null
  // A signature is 64 lowercase hex chars — `Buffer.from` silently drops
  // non-hex tail bytes, so the format check must happen before it.
  if (!/^[0-9a-f]{64}$/.test(sig)) return null
  const expected = createHmac("sha256", secret()).update(`${appointmentId}.${exp}`).digest()
  const given = Buffer.from(sig, "hex")
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  return { appointmentId }
}
