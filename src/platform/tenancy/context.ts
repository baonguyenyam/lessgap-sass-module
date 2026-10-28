import type { FieldOutputTypes } from "@/generated/prisma8/contract.d"

/**
 * Who is acting, for which tenant (spec/02-tenancy.md, "TenantContext"). Every
 * service call takes one. It is built in exactly two places: from a session
 * (`requireTenantMember`) and, for webhooks and jobs, from a tenant id read off
 * a trusted record (`systemContext`). Never from request input.
 */

/** A built-in role key (`owner`, `manager`, `staff`) or a custom role's name. */
export type TenantRole = string
export type PlatformRole = NonNullable<FieldOutputTypes["public"]["User"]["platformRole"]>

export type TenantActor =
  | { kind: "member"; userId: string; role: TenantRole }
  | { kind: "platform"; userId: string; role: PlatformRole; impersonating: true; reason: string }
  | { kind: "customer"; customerId: string | null }
  | { kind: "system"; job: string }

export type TenantContext = { tenantId: string; actor: TenantActor }

/** The context of a job or webhook acting on a tenant it read from a trusted record. */
export function systemContext(tenantId: string, job: string): TenantContext {
  return { tenantId, actor: { kind: "system", job } }
}

/** The user behind a context, when a person is acting. */
export function actingUserId(ctx: TenantContext): string | null {
  return ctx.actor.kind === "member" || ctx.actor.kind === "platform" ? ctx.actor.userId : null
}
