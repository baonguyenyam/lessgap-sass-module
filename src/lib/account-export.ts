import { toDate } from "@/lib/timestamps"

/**
 * The file a user downloads under Settings → Backup: everything this app
 * holds about them, in a form they can read and take elsewhere.
 *
 * Built from an allow-list, field by field. Credentials never leave: no
 * password hash, OAuth token, session token, two-factor secret or backup
 * code. A new column is left out until someone adds it here on purpose.
 */
export const ACCOUNT_EXPORT_VERSION = 1

type Ts = string
type Nullable<T> = T | null

export type AccountExportInput = {
  user: {
    id: string
    email: string
    name: string
    image: Nullable<string>
    role: string
    emailVerified: boolean
    twoFactorEnabled: boolean
    createdAt: Ts
    updatedAt: Ts
  }
  accounts: { providerId: string; createdAt: Ts }[]
  sessions: { createdAt: Ts; expiresAt: Ts; ipAddress: Nullable<string>; userAgent: Nullable<string> }[]
  projects: { id: string; name: string; description: Nullable<string>; createdAt: Ts; updatedAt: Ts }[]
  subscription: Nullable<{
    status: string
    currentPeriodStart: Ts
    currentPeriodEnd: Ts
    cancelAtPeriodEnd: boolean
    trialEndsAt: Nullable<Ts>
    createdAt: Ts
    plan: Nullable<{ name: string }>
  }>
  purchases: { amount: number; currency: string; status: string; createdAt: Ts; plan: Nullable<{ name: string }> }[]
  newsletter: Nullable<{ source: string; createdAt: Ts; confirmedAt: Nullable<Ts>; unsubscribedAt: Nullable<Ts> }>
}

const iso = (value: Ts) => toDate(value).toISOString()
const isoOrNull = (value: Nullable<Ts>) => toDate(value)?.toISOString() ?? null

export function buildAccountExport(input: AccountExportInput, exportedAt: Date) {
  const { user, subscription, newsletter } = input
  return {
    version: ACCOUNT_EXPORT_VERSION,
    exportedAt: exportedAt.toISOString(),
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: iso(user.createdAt),
      updatedAt: iso(user.updatedAt),
    },
    signInMethods: input.accounts.map((a) => ({ provider: a.providerId, addedAt: iso(a.createdAt) })),
    sessions: input.sessions.map((s) => ({
      startedAt: iso(s.createdAt),
      expiresAt: iso(s.expiresAt),
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
    })),
    projects: input.projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: iso(p.createdAt),
      updatedAt: iso(p.updatedAt),
    })),
    subscription: subscription && {
      plan: subscription.plan?.name ?? null,
      status: subscription.status,
      currentPeriodStart: iso(subscription.currentPeriodStart),
      currentPeriodEnd: iso(subscription.currentPeriodEnd),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      trialEndsAt: isoOrNull(subscription.trialEndsAt),
      createdAt: iso(subscription.createdAt),
    },
    purchases: input.purchases.map((p) => ({
      plan: p.plan?.name ?? null,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      createdAt: iso(p.createdAt),
    })),
    newsletter: newsletter && {
      source: newsletter.source,
      requestedAt: iso(newsletter.createdAt),
      confirmedAt: isoOrNull(newsletter.confirmedAt),
      unsubscribedAt: isoOrNull(newsletter.unsubscribedAt),
    },
  }
}

/** The download's file name: the date, never the address. */
export function accountExportFileName(exportedAt: Date): string {
  return `account-export-${exportedAt.toISOString().slice(0, 10)}.json`
}
