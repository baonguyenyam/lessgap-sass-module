import { z } from "zod"

/**
 * Platform-console forms, for the drawers in the browser and the server
 * actions, which parse again. Messages come from the caller's translations.
 */
export type CreateTenantMessages = { nameRequired: string; invalidEmail: string }

export function createTenantSchema(m: CreateTenantMessages) {
  return z.object({
    name: z.string().trim().min(1, m.nameRequired).max(120),
    /** The account that becomes the tenant's owner; must already exist. */
    ownerEmail: z.string().trim().toLowerCase().email(m.invalidEmail),
  })
}
export type CreateTenantInput = z.infer<ReturnType<typeof createTenantSchema>>
