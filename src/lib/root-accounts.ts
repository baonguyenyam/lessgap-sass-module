import type { PrismaClient } from "@/lib/prisma"

/**
 * ROOT is granted by configuration only (spec/adr/0014-root-role.md):
 * `ROOT_EMAILS` lists the accounts, comma separated, and the seeds
 * (`pnpm db:seed`, `pnpm db:seed:demo`, and so `pnpm db:reset`) promote every
 * existing user with one of those addresses.
 *
 * Removing an address from the list does not demote anyone: an empty or
 * mistyped variable must never lock the system out of its ROOT account.
 * Demoting a ROOT is a deliberate change made in the database.
 */
export function parseRootEmails(value: string | undefined): string[] {
  const emails = (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(emails)]
}

/** Promotes the users listed in ROOT_EMAILS to ROOT. Returns how many rows changed. */
export async function grantRootFromConfig(
  prisma: PrismaClient,
  env: Record<string, string | undefined> = process.env,
): Promise<number> {
  const emails = parseRootEmails(env.ROOT_EMAILS)
  if (emails.length === 0) return 0
  const { count } = await prisma.user.updateMany({
    where: { email: { in: emails }, role: { not: "ROOT" } },
    data: { role: "ROOT" },
  })
  return count
}
