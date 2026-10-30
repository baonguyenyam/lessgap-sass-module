import { z } from "zod"

/**
 * Tenant members and roles, for the drawers in the browser and the server
 * actions, which parse again. Messages come from the caller's translations.
 */
export type InviteMessages = { invalidEmail: string; roleRequired: string }

export function inviteMemberSchema(m: InviteMessages) {
  return z.object({
    email: z.string().trim().toLowerCase().email(m.invalidEmail),
    role: z.string().min(1, m.roleRequired),
  })
}
export type InviteMemberInput = z.infer<ReturnType<typeof inviteMemberSchema>>

/** A role key: lowercase letters, digits and hyphens, starting with a letter or digit. */
export const ROLE_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,30}$/

export type RoleMessages = { roleKey: string; permissionsRequired: string }

export function tenantRoleSchema(m: RoleMessages) {
  return z.object({
    role: z.string().trim().regex(ROLE_KEY_PATTERN, m.roleKey),
    /** `resource.verb` keys, one per checked permission. */
    permissions: z.array(z.string()).min(1, m.permissionsRequired),
  })
}
export type TenantRoleInput = z.infer<ReturnType<typeof tenantRoleSchema>>

/** `["projects.view", "projects.edit"]` → `{ projects: ["view", "edit"] }`. */
export function foldPermissions(keys: string[]): Record<string, string[]> {
  const permission: Record<string, string[]> = {}
  for (const key of keys) {
    const [resource, verb, extra] = key.split(".")
    if (!resource || !verb || extra !== undefined) continue
    const verbs = (permission[resource] ??= [])
    if (!verbs.includes(verb)) verbs.push(verb)
  }
  return permission
}

/** The reverse of `foldPermissions`. */
export function permissionKeys(permission: Record<string, readonly string[]>): string[] {
  return Object.entries(permission).flatMap(([resource, verbs]) => verbs.map((verb) => `${resource}.${verb}`))
}

export type CatalogMessages = { nameRequired: string; durationInvalid: string; priceInvalid: string }

export function catalogCategorySchema(m: CatalogMessages) {
  return z.object({ name: z.string().trim().min(1, m.nameRequired) })
}
export type CatalogCategoryInput = z.infer<ReturnType<typeof catalogCategorySchema>>

export function catalogServiceSchema(m: CatalogMessages) {
  return z.object({
    name: z.string().trim().min(1, m.nameRequired),
    durationMinutes: z.number().int().positive(m.durationInvalid),
    price: z.number().min(0, m.priceInvalid),
    categoryId: z.string().optional(),
  })
}
export type CatalogServiceInput = z.infer<ReturnType<typeof catalogServiceSchema>>

export function staffSchema(m: { nameRequired: string }) {
  return z.object({ name: z.string().trim().min(1, m.nameRequired), bio: z.string().trim().optional() })
}
export type StaffInput = z.infer<ReturnType<typeof staffSchema>>

export function locationSchema(m: { nameRequired: string }) {
  return z.object({ name: z.string().trim().min(1, m.nameRequired), address: z.string().trim().optional() })
}
export type LocationInput = z.infer<ReturnType<typeof locationSchema>>

export function intakeFormSchema(m: { nameRequired: string; fieldsRequired: string }) {
  return z.object({
    name: z.string().trim().min(1, m.nameRequired),
    labels: z.string().trim().min(1, m.fieldsRequired),
  })
}
export type IntakeFormInput = z.infer<ReturnType<typeof intakeFormSchema>>

export function packageSchema(m: { nameRequired: string; sessionsInvalid: string; priceInvalid: string }) {
  return z.object({
    name: z.string().trim().min(1, m.nameRequired),
    sessions: z.number().int().positive(m.sessionsInvalid),
    price: z.number().min(0, m.priceInvalid),
  })
}
export type PackageInput = z.infer<ReturnType<typeof packageSchema>>

export function membershipSchema(m: { nameRequired: string; priceInvalid: string }) {
  return z.object({ name: z.string().trim().min(1, m.nameRequired), price: z.number().min(0, m.priceInvalid) })
}
export type MembershipInput = z.infer<ReturnType<typeof membershipSchema>>

export function saleSchema(m: { amountInvalid: string; emailInvalid: string; selectRequired: string }) {
  return z
    .object({
      kind: z.enum(["card", "pkg", "mem"]),
      amount: z.number().optional(),
      email: z.string().trim().optional(),
      packageId: z.string().optional(),
      membershipId: z.string().optional(),
      customerId: z.string().optional(),
    })
    .superRefine((v, ctx) => {
      if (v.kind === "card") {
        if (!v.amount || v.amount <= 0) ctx.addIssue({ code: "custom", path: ["amount"], message: m.amountInvalid })
        if (v.email && !v.email.includes("@"))
          ctx.addIssue({ code: "custom", path: ["email"], message: m.emailInvalid })
      } else {
        const id = v.kind === "pkg" ? v.packageId : v.membershipId
        const path = v.kind === "pkg" ? ["packageId"] : ["membershipId"]
        if (!id) ctx.addIssue({ code: "custom", path, message: m.selectRequired })
        if (!v.customerId) ctx.addIssue({ code: "custom", path: ["customerId"], message: m.selectRequired })
      }
    })
}
export type SaleInput = z.infer<ReturnType<typeof saleSchema>>
