export type ModelClassification = {
  kind: "identity" | "global" | "platform-private" | "tenant-owned"
  reason: string
}

/** Every Prisma model needs a deliberate data owner before it can ship. */
export const MODEL_CLASSIFICATION = {
  Account: { kind: "identity", reason: "Better Auth credential and provider links." },
  EmailMessage: {
    kind: "platform-private",
    reason: "Platform delivery record of every email; a tenant id says whose email it was, staff read it.",
  },
  ErrorReport: {
    kind: "platform-private",
    reason: "Platform error groups for staff; a tenant id is context, not ownership.",
  },
  Invitation: { kind: "identity", reason: "Better Auth tenant invitations." },
  Job: { kind: "platform-private", reason: "Platform job queue; a tenant id is the job's scope, run by the system." },
  Member: { kind: "identity", reason: "Better Auth tenant membership records." },
  NewsletterSubscriber: {
    kind: "tenant-owned",
    reason: "Subscriber rows may belong to a tenant; a null tenantId is the platform list.",
  },
  OrganizationRole: { kind: "identity", reason: "Better Auth dynamic organization roles." },
  Plan: { kind: "global", reason: "Platform-wide plan catalogue." },
  PlatformSwitch: { kind: "global", reason: "Platform-wide feature and setting switches." },
  Project: { kind: "identity", reason: "Legacy kit records are scoped to their User until Phase 1 retires them." },
  Purchase: { kind: "identity", reason: "Legacy kit purchases are linked to their User." },
  Session: { kind: "identity", reason: "Better Auth login sessions." },
  Subscription: { kind: "identity", reason: "Legacy kit subscriptions are linked to their User." },
  Tenant: { kind: "platform-private", reason: "Platform-managed tenant directory and lifecycle state." },
  TenantModule: { kind: "tenant-owned", reason: "Which modules one tenant has turned on." },
  TenantSetting: { kind: "tenant-owned", reason: "Settings belong to one tenant." },
  TwoFactor: { kind: "identity", reason: "Better Auth two-factor credentials." },
  User: { kind: "identity", reason: "Better Auth user accounts." },
  UserSetting: { kind: "identity", reason: "Preferences belong to one user account." },
  Verification: { kind: "identity", reason: "Better Auth verification challenges." },
} as const satisfies Record<string, ModelClassification>
