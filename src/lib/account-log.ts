/**
 * The account history a user sees under Settings → Logs, built from what the
 * database already keeps: when the account was made, when each sign-in method
 * was added, two-factor authentication, and every session still on record.
 *
 * It is not an audit log. Sessions disappear when they are revoked or cleaned
 * up after expiring, and nothing records a password change or a removed
 * provider; the per-action history arrives with the `AuditLog` of phase 1.
 */
export type AccountLogEvent =
  | { kind: "account-created"; at: Date }
  | { kind: "method-added"; at: Date; providerId: string }
  | { kind: "two-factor-enabled"; at: Date }
  | {
      kind: "signed-in"
      at: Date
      userAgent: string | null
      ipAddress: string | null
      active: boolean
      current: boolean
      /** Opened by a ROOT user with Switch As, not by the account holder. */
      switched: boolean
    }

export type AccountLogInput = {
  createdAt: Date
  accounts: { providerId: string; createdAt: Date }[]
  twoFactorSince: Date | null
  sessions: {
    id: string
    createdAt: Date
    expiresAt: Date
    userAgent: string | null
    ipAddress: string | null
    switchedBy: string | null
  }[]
  currentSessionId: string | null
  now: Date
}

/** Every event, newest first. */
export function buildAccountLog(input: AccountLogInput): AccountLogEvent[] {
  const events: AccountLogEvent[] = [
    { kind: "account-created", at: input.createdAt },
    ...input.accounts.map((a) => ({ kind: "method-added" as const, at: a.createdAt, providerId: a.providerId })),
    ...input.sessions.map((s) => ({
      kind: "signed-in" as const,
      at: s.createdAt,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      active: s.expiresAt > input.now,
      current: s.id === input.currentSessionId,
      switched: s.switchedBy !== null,
    })),
  ]
  if (input.twoFactorSince) events.push({ kind: "two-factor-enabled", at: input.twoFactorSince })
  return events.sort((a, b) => b.at.getTime() - a.at.getTime())
}
