import type { FieldInputTypes } from "@/generated/prisma8/contract.d"
import { db8 } from "@/lib/db8"
import { log } from "@/platform/log"

/**
 * The "who changed this?" record (spec/13-conventions.md, "Audit"; the
 * `AuditLog` model in spec/09-data-model.md). One row per audited change —
 * members, roles, suspensions, impersonation. Platform-private: written from
 * member and staff actions alike, and read only by the console pages.
 *
 * `audit()` never throws. The change it records has already happened when it
 * runs, so a failed write is logged and the caller continues, the same
 * trade-off as the `EmailMessage` record (src/lib/email-outbox.ts).
 */

/**
 * Who acted, as the row records it. A `TenantContext`'s `actor` fits this
 * shape, so a service can forward its context unchanged; the helpers below
 * build the two cases call sites reach most often.
 */
export type AuditActor =
  | { kind: "member" | "platform"; userId: string }
  | { kind: "customer"; customerId: string | null }
  | { kind: "system"; job: string }

/** The tenant the change belongs to — null for platform-level events — and who made it. */
export type AuditContext = { tenantId: string | null; actor: AuditActor }

/** What the actor did. `action` names follow `<module>.<entity>.<verb>`. */
export type AuditEvent = {
  action: string
  targetType?: string
  targetId?: string
  /** Ids and values of the change; a row may keep what a log line never does. */
  data?: AuditData
  /** Why the change was made — suspensions and impersonation always carry one. */
  reason?: string
}

export type AuditData = NonNullable<FieldInputTypes["public"]["AuditLog"]["data"]>

/** The audit context of a member acting in their own tenant (dashboard actions). */
export function memberAuditContext(ctx: { tenantId: string; user: { id: string } }): AuditContext {
  return { tenantId: ctx.tenantId, actor: { kind: "member", userId: ctx.user.id } }
}

/** The audit context of platform staff acting outside a tenant (Switch As, the console). */
export function platformAuditContext(userId: string, tenantId: string | null = null): AuditContext {
  return { tenantId, actor: { kind: "platform", userId } }
}

/**
 * `audit()` for a member action inside a request (task 1.11): when the session
 * is a tenant impersonation, the actor on the row is the staff member, not the
 * impersonated user, and the impersonation reason stands where the event has
 * none — every mutation is audited like the start was (spec/02-tenancy.md).
 */
export async function auditRequest(ctx: { tenantId: string; user: { id: string } }, event: AuditEvent): Promise<void> {
  const { getImpersonation } = await import("@/lib/auth")
  const impersonation = await getImpersonation()
  await audit(
    impersonation
      ? { tenantId: ctx.tenantId, actor: { kind: "platform", userId: impersonation.by } }
      : memberAuditContext(ctx),
    { ...event, reason: event.reason ?? impersonation?.reason }
  )
}

function actorIdOf(actor: AuditActor): string | null {
  switch (actor.kind) {
    case "member":
    case "platform":
      return actor.userId
    case "customer":
      return actor.customerId
    case "system":
      return actor.job
  }
}

/** Write one `AuditLog` row for `event`. See the file comment: never throws. */
export async function audit(ctx: AuditContext, event: AuditEvent): Promise<void> {
  try {
    await db8.orm.public.AuditLog.create({
      tenantId: ctx.tenantId,
      actorId: actorIdOf(ctx.actor),
      actorKind: ctx.actor.kind,
      action: event.action,
      targetType: event.targetType ?? null,
      targetId: event.targetId ?? null,
      data: event.data ?? null,
      reason: event.reason ?? null,
    })
  } catch (error) {
    await log.error("audit.write_failed", { error, action: event.action, tenantId: ctx.tenantId ?? undefined })
  }
}
