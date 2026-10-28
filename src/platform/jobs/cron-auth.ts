import { timingSafeEqual } from "node:crypto"

/**
 * Whether a call to the cron route may run jobs (test O7): `CRON_SECRET` must
 * be set, and the caller must send it as `Authorization: Bearer <secret>`, as
 * Vercel Cron does and an external pinger is configured to. Compared in
 * constant time.
 */
export function cronAuthorization(
  header: string | null,
  secret: string | undefined
): "ok" | "unconfigured" | "unauthorized" {
  if (!secret?.trim()) return "unconfigured"
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header ?? "")
  return given.length === expected.length && timingSafeEqual(given, expected) ? "ok" : "unauthorized"
}
