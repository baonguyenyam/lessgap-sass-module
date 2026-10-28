export type ModelClassification = {
  kind: "identity" | "global" | "platform-private" | "tenant-owned"
  reason: string
}

/** Every Prisma model needs a deliberate data owner before it can ship. */
export const MODEL_CLASSIFICATION = {
  Account: { kind: "identity", reason: "Better Auth credential and provider links." },
  AddOn: { kind: "global", reason: "Platform catalogue of what a tenant can buy on top of its plan." },
  AuditLog: {
    kind: "platform-private",
    reason: "The who-changed-what record staff read; a tenant id is for filtering, not ownership.",
  },
  EmailMessage: {
    kind: "platform-private",
    reason: "Platform delivery record of every email; a tenant id says whose email it was, staff read it.",
  },
  EntitlementOverride: {
    kind: "tenant-owned",
    reason: "A staff override of one feature for one tenant; deleted with the tenant.",
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
  Purchase: { kind: "tenant-owned", reason: "What a tenant bought; re-owned from userId in phase 2." },
  Session: { kind: "identity", reason: "Better Auth login sessions." },
  Subscription: { kind: "tenant-owned", reason: "One subscription per tenant; re-owned from userId in phase 2." },
  Tenant: { kind: "platform-private", reason: "Platform-managed tenant directory and lifecycle state." },
  TenantAddOn: { kind: "tenant-owned", reason: "The add-ons one tenant holds." },
  TenantModule: { kind: "tenant-owned", reason: "Which modules one tenant has turned on." },
  TenantSetting: { kind: "tenant-owned", reason: "Settings belong to one tenant." },
  UsageCounter: { kind: "tenant-owned", reason: "Metered usage belongs to one tenant." },
  TwoFactor: { kind: "identity", reason: "Better Auth two-factor credentials." },
  User: { kind: "identity", reason: "Better Auth user accounts." },
  UserSetting: { kind: "identity", reason: "Preferences belong to one user account." },
  Verification: { kind: "identity", reason: "Better Auth verification challenges." },
} as const satisfies Record<string, ModelClassification>
